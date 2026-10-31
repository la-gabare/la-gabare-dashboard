import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { validerProspect } from '@/lib/prospects-hm'

export const dynamic = 'force-dynamic'

// Reçoit un prospect préparé par Harness Maxxing (écriture limitée à la table prospects_hm).
// Jeton ADMIN_WRITE_TOKEN, distinct du jeton de lecture ADMIN_API_TOKEN : il ne donne accès à rien d'autre.
function jetonValide(req: NextRequest) {
  const attendu = process.env.ADMIN_WRITE_TOKEN
  const recu = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!attendu || attendu.length < 24 || !recu) return false
  const h = (x: string) => crypto.createHash('sha256').update(x).digest()
  return crypto.timingSafeEqual(h(recu), h(attendu))
}

export async function POST(req: NextRequest) {
  if (!jetonValide(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const v = validerProspect(await req.json().catch(() => null))
  if ('erreur' in v) return NextResponse.json({ error: v.erreur }, { status: 400 })
  const { error } = await supabaseAdmin.from('prospects_hm').upsert({ ...v.prospect, updated_at: new Date().toISOString() }, { onConflict: 'slug' })
  if (error) return NextResponse.json({ error: 'Enregistrement impossible' }, { status: 500 })
  return NextResponse.json({ ok: true, slug: v.prospect.slug })
}
