import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { BoutiqueConfig } from '@/lib/boutique/core'
import { mailConfirmationAcheteur, mailNouvelleCommandeDomaine } from '@/lib/boutique/emails'

// Webhook "Connect" : reçoit les événements des comptes Stripe des domaines.
// Stripe > Développeurs > Webhooks > Ajouter un endpoint > "Événements sur les comptes connectés"
// Événements : checkout.session.completed, checkout.session.async_payment_succeeded,
// checkout.session.expired, checkout.session.async_payment_failed
export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET
  if (!signature || !secret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const commandeId = session.metadata?.commande_id
  if (session.metadata?.source !== 'boutique' || !commandeId) {
    return NextResponse.json({ received: true, ignored: true })
  }

  // Le compte qui émet l'événement doit être celui du domaine de la commande
  const { data: commande } = await supabaseAdmin
    .from('commandes')
    .select('id, client_id, statut, clients(nom_domaine, email_contact, stripe_account_id, boutique_config)')
    .eq('id', commandeId)
    .single()
  const client = (commande?.clients as unknown) as
    { nom_domaine: string; email_contact: string; stripe_account_id: string; boutique_config: BoutiqueConfig } | null
  if (!commande || !client || client.stripe_account_id !== event.account) {
    return NextResponse.json({ received: true, ignored: true })
  }

  if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
    await supabaseAdmin.rpc('boutique_liberer', { p_commande_id: commandeId })
    return NextResponse.json({ received: true })
  }

  const paye = event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded'
  if (paye && session.payment_status === 'paid' && commande.statut === 'en_attente') {
    const details = session.customer_details
    const shipping = session.collected_information?.shipping_details
    const { data: payee, error } = await supabaseAdmin.rpc('boutique_payer', {
      p_commande_id: commandeId,
      p_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null,
      p_email: details?.email || null,
      p_nom: shipping?.name || details?.name || null,
      p_telephone: details?.phone || null,
      p_livraison: shipping
        ? { mode: 'livraison', adresse: shipping.address }
        : { mode: 'retrait' },
    })
    if (error || !payee) {
      console.error('boutique_payer', error)
      return NextResponse.json({ error: 'update failed' }, { status: 500 }) // Stripe réessaiera
    }

    const domaine = client.nom_domaine
    const notif = client.boutique_config?.email_notif || client.email_contact
    const envois: Promise<unknown>[] = []
    if (payee.email) {
      envois.push(sendMail(payee.email, `Votre commande n° ${payee.numero} — ${domaine}`,
        mailConfirmationAcheteur(domaine, payee), { fromName: domaine, replyTo: notif }))
    }
    if (notif) {
      envois.push(sendMail(notif, `Nouvelle commande n° ${payee.numero} — ${(payee.total_cents / 100).toFixed(2)} €`,
        mailNouvelleCommandeDomaine(domaine, payee), { fromName: 'La Gabare — Boutique', replyTo: payee.email || undefined }))
    }
    const res = await Promise.allSettled(envois)
    res.forEach(r => { if (r.status === 'rejected') console.error('mail commande', r.reason) })
  }

  return NextResponse.json({ received: true })
}
