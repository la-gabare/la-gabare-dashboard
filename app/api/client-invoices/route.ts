import { NextRequest, NextResponse } from 'next/server'
import { getClientFromRequest } from '@/lib/auth-client'
import { withCors, corsPreflight } from '@/lib/cors'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function OPTIONS() {
  return corsPreflight()
}

export async function GET(request: NextRequest) {
  try {
    const client = await getClientFromRequest(request)
    if (!client) {
      return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    if (!client.stripe_customer_id) {
      return withCors(NextResponse.json({ invoices: [] }))
    }

    const invoices = await stripe.invoices.list({
      customer: client.stripe_customer_id,
      limit: 50,
    })

    const formattedInvoices = invoices.data.map(inv => ({
      id: inv.id,
      number: inv.number,
      amount: inv.amount_paid / 100,
      currency: inv.currency.toUpperCase(),
      date: new Date(inv.created * 1000).toLocaleDateString('fr-FR'),
      status: inv.status,
      url: inv.invoice_pdf,
    }))

    return withCors(NextResponse.json({ invoices: formattedInvoices }))
  } catch (err: any) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }))
  }
}
