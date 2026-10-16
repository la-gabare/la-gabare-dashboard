import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'
import { sendMail } from '@/lib/mailer'
import { clientParDomaine, siteBase } from '@/lib/boutique/core'
import { emailValide, tropDeRequetes, ipDe } from '@/lib/leads/public'
import { nouvelAcces, lienAcces } from '@/lib/pro/core'
import { mailAccesPro } from '@/lib/pro/emails'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return corsPreflight()
}

// « Recevoir mon lien d'accès » : envoie un nouveau lien si le pro est validé.
// Réponse identique dans tous les cas, pour ne pas révéler qui a un compte.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const reponse = withCors(NextResponse.json({ ok: true, message: 'Si votre accès est validé, vous allez recevoir un e-mail avec votre lien.' }))
  if (tropDeRequetes(ipDe(req), 5)) return withCors(NextResponse.json({ error: 'Trop de demandes, réessayez plus tard.' }, { status: 429 }))

  const email = String(body.email || '').trim().toLowerCase()
  if (!emailValide(email)) return withCors(NextResponse.json({ error: 'Adresse e-mail invalide.' }, { status: 400 }))
  const client = await clientParDomaine(String(body.domain || ''))
  if (!client?.boutique_active) return reponse

  const { data: pro } = await supabaseAdmin.from('pros').select('id, nom, statut').eq('client_id', client.id).eq('email', email).maybeSingle()
  if (!pro || pro.statut !== 'valide') return reponse
  try {
    const jeton = await nouvelAcces(pro.id)
    await sendMail(email, `Votre accès professionnel — ${client.nom_domaine}`,
      mailAccesPro(client.nom_domaine, pro.nom, lienAcces(siteBase(client), jeton), false), { fromName: client.nom_domaine })
  } catch (e) {
    console.error('pro/lien', e)
  }
  return reponse
}
