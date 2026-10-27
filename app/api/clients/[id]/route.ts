import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { lancerPlanEditorial, abonnementActive } from '@/lib/plan-editorial'

export async function PATCH(req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  const params = await paramsP
  try {
    const body = await req.json()
    const clientId = parseInt(params.id)
    const { data: avant } = await supabaseAdmin.from('clients').select('statut, abonnement').eq('id', clientId).single()

    const { data, error } = await supabaseAdmin
      .from('clients')
      .update(body)
      .eq('id', clientId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Abonnement activé (ou formule changée) depuis l'admin : le plan éditorial se lance tout seul
    if (avant && abonnementActive(avant, data)) await lancerPlanEditorial(clientId, 'admin')

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
