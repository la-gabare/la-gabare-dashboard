import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { marquerPayee, activerClient, euros } from '@/lib/paiements/echeancier'
import Stripe from 'stripe'

const AGENCE = process.env.AGENCE_NOTIF_EMAIL || process.env.SMTP_USER || ''

async function notifierAgence(sujet: string, texte: string) {
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

  // Abonnement ou lien de paiement simple : activer le client une fois le paiement réellement reçu
  if (clientId && paye && event.type !== 'checkout.session.async_payment_failed') {
    await activerClient(clientId)
  }

  return NextResponse.json({ received: true })
}
