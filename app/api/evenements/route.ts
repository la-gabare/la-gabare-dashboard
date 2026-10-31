import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Ajoute une note à l'historique d'un domaine (protégé par le mot de passe via le middleware).
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const titre = typeof b.titre === 'string' ? b.titre.trim().slice(0, 200) : ''
  if (!Number.isInteger(b.prospect_id) || !titre) return NextResponse.json({ error: 'prospect_id ou titre invalide' }, { status: 400 })
  const detail = typeof b.detail === 'string' && b.detail.trim() ? b.detail.trim().slice(0, 2000) : null
  const { error } = await supabaseAdmin.from('evenements').insert({ prospect_id: b.prospect_id, type: 'note', titre, detail })
  if (error) return NextResponse.json({ error: 'Enregistrement impossible' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
