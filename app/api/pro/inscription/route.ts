import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'
import { sendMail } from '@/lib/mailer'
import { clientParDomaine, BoutiqueConfig } from '@/lib/boutique/core'
import { texte, emailValide, tropDeRequetes, ipDe } from '@/lib/leads/public'
import { ACTIVITES } from '@/lib/pro/core'
import { mailDemandeAccesDomaine, mailAccuseDemandePro } from '@/lib/pro/emails'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return corsPreflight()
}

function json(data: unknown, status = 200) {
  return withCors(NextResponse.json(data, { status }))
}

// Page professionnels du site d'un domaine : demande d'accès pro (validée ensuite par le domaine)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  if (body.site_web) return json({ ok: true }) // piège à robots
  if (tropDeRequetes(ipDe(req), 5)) return json({ error: 'Trop de demandes, réessayez plus tard.' }, 429)

  const client = await clientParDomaine(String(body.domain || ''))
  if (!client?.boutique_active) return json({ error: 'L\'espace professionnel n\'est pas ouvert sur ce site.' }, 403)

  const email = (texte(body.email, 200) || '').toLowerCase()
  const entreprise = texte(body.entreprise, 150)
  if (!entreprise) return json({ error: 'Le nom de votre établissement est obligatoire.' }, 400)
  if (!emailValide(email)) return json({ error: 'Adresse e-mail invalide.' }, 400)
  const siret = (texte(body.siret, 20) || '').replace(/\s/g, '') || null
  if (siret && !/^\d{14}$/.test(siret)) return json({ error: 'Le SIRET doit comporter 14 chiffres.' }, 400)
  const activite = ACTIVITES.includes(String(body.activite)) ? String(body.activite) : 'autre'

  const fiche = {
    client_id: client.id, email, entreprise, siret, activite,
    nom: texte(body.nom, 120), telephone: texte(body.telephone, 30), ville: texte(body.ville, 80), message: texte(body.message, 1500),
  }

  const { data: existant } = await supabaseAdmin.from('pros').select('id, statut').eq('client_id', client.id).eq('email', email).maybeSingle()
  if (existant?.statut === 'valide') {
    return json({ ok: true, deja_valide: true, message: 'Votre accès est déjà ouvert : utilisez « Recevoir mon lien d\'accès ».' })
  }
  const { error } = existant
    ? await supabaseAdmin.from('pros').update({ ...fiche, statut: 'en_attente' }).eq('id', existant.id)
    : await supabaseAdmin.from('pros').insert(fiche)
  if (error) {
    console.error('pro/inscription', error)
    return json({ error: 'Enregistrement impossible pour le moment.' }, 500)
  }

  const config = (client.boutique_config || {}) as BoutiqueConfig
  const notif = config.email_notif || client.email_contact
  const envois = [
    sendMail(email, `Votre demande d'accès professionnel — ${client.nom_domaine}`, mailAccuseDemandePro(client.nom_domaine, entreprise),
      { fromName: client.nom_domaine, replyTo: notif }),
  ]
  if (notif) {
    envois.push(sendMail(notif, `Demande d'accès pro — ${entreprise}`, mailDemandeAccesDomaine(client.nom_domaine, fiche),
      { fromName: 'La Gabare — Espace pro', replyTo: email }))
  }
  ;(await Promise.allSettled(envois)).forEach((r) => { if (r.status === 'rejected') console.error('pro/inscription mail', r.reason) })

  return json({ ok: true })
}
