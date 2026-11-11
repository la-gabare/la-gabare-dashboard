import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { lireApercu, urlApercu } from '@/lib/maquettes-prospects'
import { EMAIL_RE, htmlMailMaquette, messageParDefaut, objetParDefaut } from '@/lib/mail-maquette'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Mail « Votre maquette » à un prospect push, en deux temps (protégé par le mot de passe via le middleware) :
//   POST { id }                                   -> proposition (objet + message type) à relire
//   POST { id, to, objet, message }               -> aperçu exact du mail, rien n'est envoyé
//   POST { id, to, objet, message, confirme:true } -> envoi réel, seulement après validation explicite
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (!Number.isInteger(b.id)) return NextResponse.json({ error: 'id invalide' }, { status: 400 })
  const { data: pr } = await supabaseAdmin.from('prospects_hm').select('id, slug, nom, appellation, commune, stade, maquette_url').eq('id', b.id).single()
  if (!pr) return NextResponse.json({ error: 'Prospect introuvable' }, { status: 404 })
  if (!pr.maquette_url) return NextResponse.json({ error: 'Ce prospect n\'a pas de maquette' }, { status: 400 })

  if (b.to === undefined) {
    return NextResponse.json({ objet: objetParDefaut(pr.nom), message: messageParDefaut(pr) })
  }

  const to = typeof b.to === 'string' ? b.to.trim() : ''
  const objet = typeof b.objet === 'string' ? b.objet.replace(/[\r\n]+/g, ' ').trim().slice(0, 200) : ''
  const message = typeof b.message === 'string' ? b.message.trim().slice(0, 6000) : ''
  if (!EMAIL_RE.test(to)) return NextResponse.json({ error: 'Adresse e-mail invalide' }, { status: 400 })
  if (!objet || !message) return NextResponse.json({ error: 'Objet et message obligatoires' }, { status: 400 })
  if (/\[Ajoutez ici/i.test(message)) return NextResponse.json({ error: 'Remplacez ou supprimez la phrase entre crochets avant de continuer' }, { status: 400 })

  const interne = pr.maquette_url.startsWith('/api/prospects/maquette/')
  const lien = interne ? null : pr.maquette_url
  const [bureau, mobile] = interne
    ? await Promise.all([lireApercu(pr.slug, 'bureau'), lireApercu(pr.slug, 'mobile')])
    : [null, null]
  if (interne && !bureau) return NextResponse.json({ error: 'Capture de la maquette introuvable' }, { status: 400 })

  if (b.confirme !== true) {
    const base = urlApercu(pr.slug).replace(/\/bureau$/, '')
    const html = htmlMailMaquette(pr, message, { srcBureau: bureau ? `${base}/bureau` : undefined, srcMobile: mobile ? `${base}/mobile` : undefined, lien })
    return NextResponse.json({ apercu: html, to, objet })
  }

  const html = htmlMailMaquette(pr, message, { srcBureau: bureau ? 'cid:maquette-bureau' : undefined, srcMobile: mobile ? 'cid:maquette-mobile' : undefined, lien })
  const attachments = [
    bureau && { filename: 'maquette-bureau.jpg', content: bureau, contentType: 'image/jpeg', cid: 'maquette-bureau' },
    mobile && { filename: 'maquette-mobile.jpg', content: mobile, contentType: 'image/jpeg', cid: 'maquette-mobile' },
  ].filter(Boolean) as { filename: string; content: Buffer; contentType: string; cid: string }[]
  try {
    await sendMail(to, objet, html, { replyTo: process.env.SMTP_USER, attachments })
  } catch (e) {
    console.error('envoi maquette prospect', pr.id, e)
    return NextResponse.json({ error: 'Envoi impossible : le mail n\'est pas parti' }, { status: 502 })
  }
  await supabaseAdmin.from('evenements').insert({ prospect_id: pr.id, type: 'mail', titre: 'Maquette envoyée par mail', detail: `Objet : ${objet}\n\n${message}` })
  if (pr.stade === 'prospect' || pr.stade === 'pret') {
    await supabaseAdmin.from('prospects_hm').update({ stade: 'contacte', updated_at: new Date().toISOString() }).eq('id', pr.id)
  }
  return NextResponse.json({ ok: true })
}
