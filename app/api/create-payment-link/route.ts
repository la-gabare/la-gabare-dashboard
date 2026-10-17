import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail, paymentLinkEmail } from '@/lib/mailer'

export async function POST(req: NextRequest) {
  const { client_id, type, montant, description } = await req.json()

  if (!client_id || !type || !montant) {
    return NextResponse.json({ error: 'client_id, type et montant sont requis' }, { status: 400 })
  }

  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .select('id, nom_domaine, email_contact, stripe_customer_id')
    .eq('id', client_id)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
  }

  const priceData: {
    currency: string
    product_data: { name: string }
    unit_amount: number
    recurring?: { interval: 'month' }
  } = {
    currency: 'eur',
    product_data: { name: description || `La Gabare — ${client.nom_domaine}` },
    unit_amount: Math.round(montant * 100),
  }

  if (type === 'abonnement') {
    priceData.recurring = { interval: 'month' }
  }

  // Un client Stripe par domaine : toutes ses factures (acompte, soldes, abonnement) apparaissent dans son espace client
  let customerId: string | null = client.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: client.email_contact || undefined,
      name: client.nom_domaine,
      metadata: { client_id: String(client.id) },
    })
    customerId = customer.id
    await supabaseAdmin.from('clients').update({ stripe_customer_id: customerId }).eq('id', client.id)
  }

  const params = {
    mode: type === 'abonnement' ? 'subscription' as const : 'payment' as const,
    customer: customerId,
    ...(type === 'abonnement' ? {} : { invoice_creation: { enabled: true } }),
    line_items: [{ price_data: priceData, quantity: 1 }],
    metadata: { client_id: String(client.id) },
    success_url: 'https://la-gabare.fr/merci-paiement.html',
    cancel_url: 'https://la-gabare.fr/abonnement.html',
  }
  // Abonnement : carte ou prélèvement SEPA (si le prélèvement n'est pas activé sur Stripe, carte seule)
  let session
  try {
    session = await stripe.checkout.sessions.create({
      ...params,
      payment_method_types: type === 'abonnement' ? ['card', 'sepa_debit'] : ['card'],
    })
  } catch (err) {
    if (type !== 'abonnement') throw err
    console.error('Prélèvement SEPA indisponible, carte seule :', err instanceof Error ? err.message : err)
    session = await stripe.checkout.sessions.create({ ...params, payment_method_types: ['card'] })
  }

  if (session.url && client.email_contact) {
    await sendMail(
      client.email_contact,
      `Votre lien de paiement — ${client.nom_domaine}`,
      paymentLinkEmail(client.nom_domaine, montant, type, session.url)
    )
  }

  return NextResponse.json({ url: session.url })
}
