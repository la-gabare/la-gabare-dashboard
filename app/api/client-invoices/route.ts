import { NextRequest, NextResponse } from 'next/server'
import { getClientFromRequest } from '@/lib/auth-client'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(request: NextRequest) {
  try {
    const client = await getClientFromRequest(request)
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!client.stripe_customer_id) {
      return NextResponse.json({ invoices: [] })
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

    return NextResponse.json({ invoices: formattedInvoices })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
