import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ALLOWED_TABLES = [
  'leads',
  'clients',
  'articles',
  'posts',
  'cahier_des_charges',
  'newsletters',
  'publications',
  'audits_gratuits',
  'formulaire_complet',
  'taches',
  'plans_generation',
  'mail_hebdo_requests',
  'client_google_accounts',
  'avis_google',
  'newsletter_abonnes',
  'sites_generes',
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const table = searchParams.get('table')

  if (!table || !ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: 'Invalid or missing table' }, { status: 400 })
  }

  let query = supabaseAdmin.from(table).select('*')

  const id = searchParams.get('id')
  if (id) query = query.eq('id', id)

  const eqColumn = searchParams.get('eq_column')
  const eqValue = searchParams.get('eq_value')
  if (eqColumn && eqValue !== null) {
    let value: string | boolean = eqValue
    if (eqValue === 'true') value = true
    if (eqValue === 'false') value = false
    query = query.eq(eqColumn, value)
  }

  const orderColumn = searchParams.get('order_column')
  if (orderColumn) {
    const ascending = searchParams.get('order_asc') !== 'false'
    query = query.order(orderColumn, { ascending })
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}
