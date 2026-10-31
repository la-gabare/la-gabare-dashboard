import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { STADES, LABELS_STADE } from '@/lib/prospects-hm'

// Changement de stade d'un prospect depuis l'admin (protégé par le mot de passe via le middleware).
export async function PATCH(req: NextRequest) {
  const { id, stade } = await req.json().catch(() => ({}))
  if (!Number.isInteger(id) || !STADES.includes(stade)) return NextResponse.json({ error: 'id ou stade invalide' }, { status: 400 })
  const { error } = await supabaseAdmin.from('prospects_hm').update({ stade, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 })
  await supabaseAdmin.from('evenements').insert({ prospect_id: id, type: 'prospect', titre: `Stade : ${LABELS_STADE[stade as keyof typeof LABELS_STADE]}` })
  return NextResponse.json({ ok: true })
}
