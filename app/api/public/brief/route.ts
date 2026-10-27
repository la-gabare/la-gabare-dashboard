import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'
import { CHAMPS_BRIEF_TEXTE, CHAMPS_BRIEF_BOOLEENS, texte, emailValide, tropDeRequetes, ipDe } from '@/lib/leads/public'
import { notifierAgenceBrief } from '@/lib/leads/mails'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return corsPreflight()
}

function json(data: unknown, status = 200) {
  return withCors(NextResponse.json(data, { status }))
}

// Formulaire détaillé (formulaire-complet.html?lead_id=…) : enregistre le brief, le rattache au lead,
// passe le lead en « formulaire_complete » et prévient l'agence
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Requête invalide' }, 400) }
  if (await tropDeRequetes(ipDe(req))) return json({ error: 'Trop de demandes, réessayez plus tard.' }, 429)

  const brief: Record<string, unknown> = {}
  for (const k of CHAMPS_BRIEF_TEXTE) brief[k] = texte(body[k])
  for (const k of CHAMPS_BRIEF_BOOLEENS) brief[k] = body[k] === true || body[k] === 'on'
  brief.email = (brief.email as string | null)?.toLowerCase() || null
  brief.source = brief.source || 'formulaire-complet'

  if (!brief.nom_domaine || !brief.nom_contact) return json({ error: 'Le nom du domaine et votre nom sont obligatoires.' }, 400)
  if (!emailValide(brief.email as string)) return json({ error: 'Adresse e-mail invalide.' }, 400)
  if (!brief.telephone) return json({ error: 'Votre numéro de téléphone est obligatoire.' }, 400)

  // Lead d'origine : celui du lien reçu par e-mail, sinon le plus récent avec la même adresse
  let leadId: number | null = null
  const demande = Number(body.lead_id)
  if (Number.isInteger(demande) && demande > 0) {
    const { data } = await supabaseAdmin.from('leads').select('id').eq('id', demande).maybeSingle()
    if (data) leadId = data.id
  }
  if (!leadId) {
    const { data } = await supabaseAdmin.from('leads').select('id')
      .ilike('email', brief.email as string).order('created_at', { ascending: false }).limit(1)
    if (data?.[0]) leadId = data[0].id
  }
  brief.lead_id = leadId

  const { data: cree, error } = await supabaseAdmin.from('formulaire_complet').insert(brief).select().single()
  if (error || !cree) {
    console.error('public/brief insert', error)
    return json({ error: 'Enregistrement impossible pour le moment.' }, 500)
  }
  // Le statut n'avance que depuis les premières étapes : un lead déjà en rendez-vous, client ou archivé ne recule pas
  if (leadId) await supabaseAdmin.from('leads').update({ statut: 'formulaire_complete' }).eq('id', leadId).in('statut', ['reception', 'mail_envoye', 'relance'])
  try { await notifierAgenceBrief(cree, Boolean(leadId)) } catch (e) { console.error('public/brief notif', e) }

  return json({ ok: true, id: cree.id, lead_id: leadId })
}
