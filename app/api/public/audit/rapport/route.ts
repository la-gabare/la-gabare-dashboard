import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'
import { produireRapportAudit } from '@/lib/audit-ia'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // relevé du site + rédaction par Claude

export async function OPTIONS() {
  return corsPreflight()
}

const json = (data: unknown, status = 200) => withCors(NextResponse.json(data, { status }))

// Appelé par audit-gratuit.html juste après l'envoi du questionnaire (id + jeton renvoyés par /api/public/audit)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const id = Number(body.id)
  const token = String(body.token || '')
  if (!id || token.length < 20) return json({ error: 'Requête invalide' }, 400)

  const { data: lead } = await supabaseAdmin.from('leads').select('id, rapport_token, rapport_envoye_at').eq('id', id).single()
  if (!lead || lead.rapport_token !== token) return json({ error: 'Requête invalide' }, 403)
  if (lead.rapport_envoye_at) return json({ ok: true, deja_envoye: true })

  try {
    await produireRapportAudit(id)
    await supabaseAdmin.from('leads').update({ statut: 'mail_envoye', mail_envoye_at: new Date().toISOString() }).eq('id', id)
    return json({ ok: true })
  } catch (e) {
    console.error('rapport audit', id, e)
    return json({ ok: false, error: 'Rapport en préparation' }, 202) // la tâche du matin réessaiera
  }
}
