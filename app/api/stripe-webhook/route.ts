import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import Stripe from 'stripe'

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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const clientId = session.metadata?.client_id

    if (clientId) {
      const { data: client } = await supabaseAdmin
        .from('clients')
        .update({ statut: 'actif' })
        .eq('id', clientId)
        .select('email_contact')
        .single()

      if (client?.email_contact) {
        await supabaseAdmin.auth.admin.inviteUserByEmail(client.email_contact, {
          redirectTo: 'https://la-gabare.fr/bienvenue.html',
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}
