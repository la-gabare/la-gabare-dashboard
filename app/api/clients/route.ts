import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { lancerPlanEditorial, abonnementActive } from '@/lib/plan-editorial'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const { data, error } = await supabaseAdmin
    .from('clients')
    .insert([body])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...fields } = body

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }
  const { data: avant } = await supabaseAdmin.from('clients').select('statut, abonnement').eq('id', id).single()

  const { data, error } = await supabaseAdmin
    .from('clients')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (avant && abonnementActive(avant, data)) await lancerPlanEditorial(id, 'admin')

  return NextResponse.json(data)
}
