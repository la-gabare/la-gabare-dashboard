import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Rattache (ou détache) un lead ou un client à la fiche d'un domaine (protégé par le mot de passe via le middleware).
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const table = b.type === 'lead' ? 'leads' : b.type === 'client' ? 'clients' : null
  if (!table || !Number.isInteger(b.id) || !Number.isInteger(b.prospect_id)) {
    return NextResponse.json({ error: 'type, id ou prospect_id invalide' }, { status: 400 })
  }
  const lier = b.lier !== false
  const { error } = await supabaseAdmin.from(table).update({ prospect_id: lier ? b.prospect_id : null }).eq('id', b.id)
  if (error) return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 })
  await supabaseAdmin.from('evenements').insert({
    prospect_id: b.prospect_id, type: b.type,
    titre: `${b.type === 'lead' ? 'Lead' : 'Client'} n° ${b.id} ${lier ? 'rattaché' : 'détaché'}`,
  })
  return NextResponse.json({ ok: true })
}
