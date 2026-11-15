import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { EMAIL_RE } from '@/lib/mail-maquette'
import { htmlMailPresentation, messagePresentation, objetPresentation } from '@/lib/mail-presentation'
import { LIMITE_JOUR, debutJourneeParis, messageAPersonnaliser, restantAujourdhui } from '@/lib/campagne'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const COLONNES = 'id, nom, appellation, commune, site, email, telephone, indices, statut, envoye_le, erreur'

async function envoyesAujourdhui() {
  const { count } = await supabaseAdmin.from('campagne_destinataires').select('id', { count: 'exact', head: true })
    .eq('campagne', 'presentation').eq('statut', 'envoye').gte('envoye_le', debutJourneeParis().toISOString())
  return count ?? 0
}

// Liste des destinataires et compteur du jour (protégé par le mot de passe via le middleware).
export async function GET() {
  const { data, error } = await supabaseAdmin.from('campagne_destinataires').select(COLONNES).eq('campagne', 'presentation').order('nom').limit(2000)
  if (error) return NextResponse.json({ error: 'Table de la campagne absente : exécutez sql/campagnes.sql dans Supabase' }, { status: 404 })
  const aujourdhui = await envoyesAujourdhui()
  return NextResponse.json({ destinataires: data, aujourdhui, limite: LIMITE_JOUR, restant: restantAujourdhui(aujourdhui) })
}

// Un destinataire à la fois, en trois temps (aucun envoi groupé automatique) :
//   { action:'proposition', id }                      -> objet + message type à personnaliser
//   { action:'apercu', objet, message }               -> aperçu exact, rien n'est envoyé
//   { action:'test', to, objet, message }             -> un exemplaire à l'adresse indiquée (vous), non compté
//   { action:'envoyer', id, objet, message, confirme:true } -> envoi réel, plafonné par jour
//   { action:'refus', id }                            -> le domaine ne sera plus jamais contacté
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const objet = typeof b.objet === 'string' ? b.objet.replace(/[\r\n]+/g, ' ').trim().slice(0, 200) : ''
  const message = typeof b.message === 'string' ? b.message.trim().slice(0, 6000) : ''

  if (b.action === 'refus' || b.action === 'proposition' || b.action === 'envoyer') {
    if (!Number.isInteger(b.id)) return NextResponse.json({ error: 'id invalide' }, { status: 400 })
  }

  if (b.action === 'refus') {
    const { error } = await supabaseAdmin.from('campagne_destinataires').update({ statut: 'refus' }).eq('id', b.id)
    return error ? NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 }) : NextResponse.json({ ok: true })
  }

  if (b.action === 'proposition') {
    const { data: d } = await supabaseAdmin.from('campagne_destinataires').select('nom').eq('id', b.id).single()
    if (!d) return NextResponse.json({ error: 'Destinataire introuvable' }, { status: 404 })
    return NextResponse.json({ objet: objetPresentation, message: messagePresentation(d.nom) })
  }

  if (!objet || !message) return NextResponse.json({ error: 'Objet et message obligatoires' }, { status: 400 })

  if (b.action === 'apercu') return NextResponse.json({ apercu: htmlMailPresentation(message) })

  if (b.action === 'test') {
    const to = typeof b.to === 'string' ? b.to.trim() : ''
    if (!EMAIL_RE.test(to)) return NextResponse.json({ error: 'Adresse e-mail invalide' }, { status: 400 })
    try { await sendMail(to, `[TEST] ${objet}`, htmlMailPresentation(message), { replyTo: process.env.SMTP_USER }) }
    catch (e) { console.error('test campagne', e); return NextResponse.json({ error: 'Envoi du test impossible' }, { status: 502 }) }
    return NextResponse.json({ ok: true })
  }

  if (b.action !== 'envoyer' || b.confirme !== true) return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  if (messageAPersonnaliser(message)) return NextResponse.json({ error: 'Remplacez ou supprimez la phrase entre crochets avant d\'envoyer' }, { status: 400 })
  if (restantAujourdhui(await envoyesAujourdhui()) === 0) return NextResponse.json({ error: `Plafond du jour atteint (${LIMITE_JOUR} mails). Reprenez demain.` }, { status: 429 })

  // Réservation avant l'envoi : un double clic ou deux onglets ne peuvent pas écrire deux fois au même domaine.
  const { data: pris } = await supabaseAdmin.from('campagne_destinataires')
    .update({ statut: 'envoye', envoye_le: new Date().toISOString(), erreur: null })
    .eq('id', b.id).in('statut', ['a_contacter', 'erreur']).select('id, email').maybeSingle()
  if (!pris) return NextResponse.json({ error: 'Ce domaine a déjà été contacté ou a refusé' }, { status: 409 })
  try {
    await sendMail(pris.email, objet, htmlMailPresentation(message), { replyTo: process.env.SMTP_USER })
  } catch (e) {
    console.error('envoi campagne', pris.id, e)
    await supabaseAdmin.from('campagne_destinataires').update({ statut: 'erreur', envoye_le: null, erreur: 'Envoi impossible' }).eq('id', pris.id)
    return NextResponse.json({ error: 'Envoi impossible : le mail n\'est pas parti' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
