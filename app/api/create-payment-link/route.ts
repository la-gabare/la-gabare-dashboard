import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const { client_id, type, montant, description } = await req.json()

  if (!client_id || !type || !montant) {
    return NextResponse.json({ error: 'client_id, type et montant sont requis' }, { status: 400 })
  }

  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .select('id, nom_domaine, email_contact')
    .eq('id', client_id)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://admin.la-gabare.fr'

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

  const session = await stripe.checkout.sessions.create({
    mode: type === 'abonnement' ? 'subscription' : 'payment',
    payment_method_types: ['card'],
    customer_email: client.email_contact,
    line_items: [{ price_data: priceData, quantity: 1 }],
    metadata: { client_id: String(client.id) },
    success_url: `${siteUrl}/clients/${client.id}?payment=success`,
    cancel_url: `${siteUrl}/clients/${client.id}?payment=cancelled`,
  })

  return NextResponse.json({ url: session.url })
}
