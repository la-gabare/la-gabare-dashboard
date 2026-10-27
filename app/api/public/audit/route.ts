import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'
import { texte, emailValide, tropDeRequetes, ipDe } from '@/lib/leads/public'
import crypto from 'crypto'
import { envoyerPriseDeContact, notifierAgenceLead } from '@/lib/leads/mails'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return corsPreflight()
}

function json(data: unknown, status = 200) {
  return withCors(NextResponse.json(data, { status }))
}

// Réponses du questionnaire audit-gratuit.html
const QUESTIONS: Record<string, [string, Record<string, string>]> = {
  content: ['Contenu', { peu: 'peu', regulier: 'régulier', intensif: 'intensif' }],
  social: ['Réseaux', { non: 'non', oui_base: 'oui, basique', oui_intensif: 'oui, intensif' }],
  avis: ['Avis Google', { non: 'pas de réponse', oui_72h: 'réponse sous 72 h', oui_24h: 'réponse sous 24 h' }],
  site: ['Site', { ok: 'satisfaisant', refond: 'à refaire', non: 'pas de site' }],
  manager: ['Géré par', { vous: 'le vigneron', agence: 'une agence', salarie: 'un salarié' }],
}

// Audit gratuit de la-gabare.fr : enregistré comme un lead (type « audit »), mail de prise de contact immédiat
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  if (body.site_web) return json({ ok: true }) // piège à robots
  if (await tropDeRequetes(ipDe(req))) return json({ error: 'Trop de demandes, réessayez plus tard.' }, 429)

  const nom = texte(body.nom, 120)
  const email = (texte(body.email, 200) || '').toLowerCase()
  if (!nom) return json({ error: 'Votre nom est obligatoire.' }, 400)
  if (!emailValide(email)) return json({ error: 'Adresse e-mail invalide.' }, 400)

  if (body.consent !== true && body.consent !== 'on') return json({ error: 'Merci d\'accepter d\'être recontacté.' }, 400)

  const reponses = Object.entries(QUESTIONS)
    .map(([k, [libelle, valeurs]]) => {
      const v = texte(body[k], 50)
      return v ? `${libelle} : ${valeurs[v] || v}` : null
    })
    .filter(Boolean)
  const abonnement = texte(body.recommendation, 40)
  const packSite = texte(body.pack_site, 20)

  const lead = {
    nom, email,
    domaine: texte(body.domaine, 150),
    url: texte(body.url, 300),
    parrain_code: texte(body.parrain, 20),
    type_demande: 'audit',
    rapport_token: crypto.randomBytes(24).toString('base64url'),
    pack_demande: packSite,
    besoins: `Audit gratuit — ${reponses.join(' · ')}`.slice(0, 3000),
    message: [
      abonnement && `Abonnement conseillé par l'audit : ${abonnement}`,
      packSite && `Pack site conseillé : ${packSite}`,
    ].filter(Boolean).join('\n') || null,
    consent: true,
    statut: 'reception',
  }

  const { data: cree, error } = await supabaseAdmin.from('leads').insert(lead).select().single()
  if (error || !cree) {
    console.error('public/audit insert', error)
    return json({ error: 'Enregistrement impossible pour le moment.' }, 500)
  }

  // Sans clé Anthropic configurée : comportement classique (mail de prise de contact + alerte agence)
  if (!process.env.ANTHROPIC_API_KEY) {
    let mailEnvoye = false
    try {
      await envoyerPriseDeContact({ ...cree, lead_id: cree.id })
      mailEnvoye = true
      await supabaseAdmin.from('leads').update({
        statut: 'mail_envoye', mail_envoye_at: new Date().toISOString(), rapport_envoye_at: new Date().toISOString(),
      }).eq('id', cree.id)
    } catch (e) {
      console.error('public/audit mail', e)
    }
    try { await notifierAgenceLead(cree, mailEnvoye) } catch (e) { console.error('public/audit notif', e) }
    return json({ ok: true, id: cree.id })
  }

  // Le prospect reçoit son rapport d'audit (IA) à la place du mail de prise de contact :
  // la page appelle /api/public/audit/rapport juste après ; la tâche quotidienne rattrape les oublis.
  // L'agence reçoit une copie du rapport (ou une alerte si la rédaction échoue).

  return json({ ok: true, id: cree.id, token: cree.rapport_token })
}
