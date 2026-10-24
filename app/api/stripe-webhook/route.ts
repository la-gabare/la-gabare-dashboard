import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { notifier, enTexte } from '@/lib/notifier'
import { marquerPayee, activerClient, euros } from '@/lib/paiements/echeancier'
import { lancerPlanEditorial } from '@/lib/plan-editorial'
import Stripe from 'stripe'

const AGENCE = process.env.AGENCE_NOTIF_EMAIL || process.env.SMTP_USER || ''

async function notifierAgence(sujet: string, texte: string) {
  await notifier({
    titre: sujet, corps: enTexte(texte), url: 'https://admin.la-gabare.fr/clients',
    niveau: /échou|impay/i.test(sujet) ? 'warning' : 'success',
  })
  if (!AGENCE) return
  try {
    await sendMail(AGENCE, sujet, `<p style="font-family:Arial,sans-serif;font-size:14px;">${texte}</p>
<p style="font-family:Arial,sans-serif;font-size:14px;"><a href="https://admin.la-gabare.fr/clients">Ouvrir les clients dans le dashboard</a></p>`,
      { fromName: 'La Gabare — Paiements' })
  } catch (e) {
    console.error('stripe-webhook notif', e)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 })
  }

  // Fin d'abonnement (résiliation arrivée à échéance ou arrêt manuel dans Stripe)
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
    const { data: c } = await supabaseAdmin.from('clients')
      .update({ statut: 'inactif', date_fin_abonnement: new Date().toISOString().slice(0, 10) })
      .eq('stripe_customer_id', customer).select('id, nom_domaine').maybeSingle()
    if (c) await notifierAgence(`Abonnement terminé — ${c.nom_domaine}`, `L'abonnement de ${c.nom_domaine} est arrivé à son terme : la fiche passe en « inactif ».`)
    return NextResponse.json({ received: true })
  }

  const types = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed']
  if (!types.includes(event.type)) return NextResponse.json({ received: true })

  const session = event.data.object as Stripe.Checkout.Session
  const clientId = session.metadata?.client_id
  const echeanceId = Number(session.metadata?.echeance_id) || null
  const paye = session.payment_status === 'paid' || session.payment_status === 'no_payment_required'

  if (clientId && typeof session.customer === 'string') {
    await supabaseAdmin.from('clients').update({ stripe_customer_id: session.customer }).eq('id', clientId).is('stripe_customer_id', null)
  }

  // Versement d'un site (échéancier)
  if (echeanceId) {
    if (event.type === 'checkout.session.async_payment_failed') {
      await supabaseAdmin.from('echeances').update({ statut: 'envoye' }).eq('id', echeanceId).neq('statut', 'paye')
      await notifierAgence('Virement échoué', `Le virement du versement n° ${echeanceId} a échoué (client ${clientId}). Le lien de paiement reste valable.`)
    } else if (paye) {
      const e = await marquerPayee(echeanceId, event.type === 'checkout.session.async_payment_succeeded' ? 'virement' : 'carte')
      if (e) await notifierAgence(`Paiement reçu — ${euros(e.montant_cents)}`, `« ${e.libelle} » réglé (client ${clientId}).`)
    } else {
      // Virement choisi : le client a reçu l'IBAN, l'argent n'est pas encore arrivé
      await supabaseAdmin.from('echeances').update({ statut: 'virement_en_attente' }).eq('id', echeanceId).neq('statut', 'paye')
    }
    return NextResponse.json({ received: true })
  }

  // Indemnité de résiliation anticipée payée : arrêt immédiat de l'abonnement (le webhook
  // customer.subscription.deleted passe ensuite la fiche en « inactif »)
  if (clientId && paye && session.metadata?.resiliation_anticipee) {
    try { await stripe.subscriptions.cancel(session.metadata.resiliation_anticipee) } catch (e) { console.error('arrêt abonnement', e) }
    const { data: c } = await supabaseAdmin.from('clients')
      .update({ resiliation_demandee_at: new Date().toISOString(), date_fin_abonnement: new Date().toISOString().slice(0, 10), statut: 'inactif' })
      .eq('id', clientId).select('nom_domaine, email_contact').single()
    if (c?.email_contact) {
      try {
        await sendMail(c.email_contact, `Résiliation de votre abonnement — ${c.nom_domaine}`,
          `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A3E37;max-width:560px;"><p>Bonjour,</p>
           <p>Votre règlement est bien reçu : votre abonnement est résilié à compter d'aujourd'hui et plus aucun prélèvement ne sera effectué.
           Votre site reste le vôtre. Merci pour ces mois passés ensemble — si vous souhaitez revenir, il suffit de répondre à ce message.</p>
           <p>L'équipe La Gabare</p></div>`, { fromName: 'La Gabare', replyTo: AGENCE || undefined })
      } catch (e) { console.error('mail résiliation anticipée', e) }
    }
    await notifierAgence(`Résiliation anticipée — ${c?.nom_domaine || clientId}`,
      `Indemnité de ${euros(session.amount_total || 0)} réglée : abonnement arrêté immédiatement.${session.metadata.motif ? ` Motif : ${session.metadata.motif}` : ''}`)
    return NextResponse.json({ received: true })
  }

  // Abonnement ou lien de paiement simple : activer le client une fois le paiement réellement reçu
  if (clientId && paye && event.type !== 'checkout.session.async_payment_failed') {
    await activerClient(clientId)
    if (session.mode === 'subscription') {
      await supabaseAdmin.from('clients').update({ date_debut_abonnement: new Date().toISOString().slice(0, 10) })
        .eq('id', clientId).is('date_debut_abonnement', null)
      // Premier paiement de l'abonnement : le plan éditorial du mois se lance tout seul
      await lancerPlanEditorial(clientId, 'abonnement')
    }
  }

  return NextResponse.json({ received: true })
}
