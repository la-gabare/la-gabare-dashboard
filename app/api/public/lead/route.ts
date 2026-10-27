import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'
import { CHAMPS_LEAD, texte, emailValide, tropDeRequetes, ipDe } from '@/lib/leads/public'
import { envoyerPriseDeContact, notifierAgenceLead } from '@/lib/leads/mails'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return corsPreflight()
}

function json(data: unknown, status = 200) {
  return withCors(NextResponse.json(data, { status }))
}

// Formulaire « Commander » du site : enregistre le lead et envoie tout de suite le mail de prise de contact
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Requête invalide' }, 400) }

  if (body.site_web) return json({ ok: true }) // piège à robots
  if (await tropDeRequetes(ipDe(req))) return json({ error: 'Trop de demandes, réessayez plus tard.' }, 429)

  const lead: Record<string, unknown> = {}
  for (const k of CHAMPS_LEAD) lead[k] = texte(body[k])
  lead.email = (lead.email as string | null)?.toLowerCase() || null
  lead.consent = body.consent === true || body.consent === 'on'
  lead.statut = 'reception'

  if (!lead.nom) return json({ error: 'Votre nom est obligatoire.' }, 400)
  if (!emailValide(lead.email as string)) return json({ error: 'Adresse e-mail invalide.' }, 400)
  if (!lead.consent) return json({ error: 'Merci d\'accepter la politique de confidentialité.' }, 400)

  const { data: cree, error } = await supabaseAdmin.from('leads').insert(lead).select().single()
  if (error || !cree) {
    console.error('public/lead insert', error)
    return json({ error: 'Enregistrement impossible pour le moment.' }, 500)
  }

  let mailEnvoye = false
  try {
    await envoyerPriseDeContact({ ...cree, lead_id: cree.id })
    mailEnvoye = true
    await supabaseAdmin.from('leads')
      .update({ statut: 'mail_envoye', mail_envoye_at: new Date().toISOString() })
      .eq('id', cree.id)
  } catch (e) {
    console.error('public/lead mail', e) // le lead reste en « reception » : bouton Mail du dashboard
  }
  try { await notifierAgenceLead(cree, mailEnvoye) } catch (e) { console.error('public/lead notif', e) }

  return json({ ok: true, id: cree.id, mail_envoye: mailEnvoye })
}
