import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { parrainParCode, PARRAINAGE } from '@/lib/parrainage'
import { lancerPlanEditorial, abonnementActive } from '@/lib/plan-editorial'

export async function POST(req: NextRequest) {
  const body = await req.json()
  // Lead venu par parrainage : lien avec le parrain et mois offert en plus
  const { parrain_code, ...champs } = body
  const parrain = parrain_code ? await parrainParCode(parrain_code) : null
  if (parrain) Object.assign(champs, { parrain_id: parrain.id, mois_offerts_bonus: PARRAINAGE.moisOffertsFilleul })

  const { data, error } = await supabaseAdmin
    .from('clients')
    .insert([champs])
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
