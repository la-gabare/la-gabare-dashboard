import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ouvrirPaiement, Echeance } from '@/lib/paiements/echeancier'
import { tropDeRequetes, ipDe } from '@/lib/leads/public'

export const dynamic = 'force-dynamic'

function page(titre: string, texte: string, status = 200) {
  return new NextResponse(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titre} — La Gabare</title><meta name="robots" content="noindex"></head>
<body style="margin:0;background:#EDE9E2;font-family:Arial,sans-serif;color:#1A1310;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px;">
<div style="max-width:480px;background:#F5F2EC;border:1px solid rgba(26,19,16,.1);padding:40px;text-align:center;">
<p style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">La Gabare</p>
<h1 style="font-family:Georgia,serif;font-weight:400;font-size:24px;margin:0 0 12px;">${titre}</h1>
<p style="font-size:15px;line-height:1.6;color:#4A3E37;margin:0 0 24px;">${texte}</p>
<a href="https://la-gabare.fr" style="color:#5A1226;">Retour au site</a></div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

// Lien de paiement permanent d'un versement : crée une session Stripe neuve à chaque clic
// (les sessions Stripe expirent après 24 h, ce lien-ci reste valable dans les mails et relances).
export async function GET(req: NextRequest, { params: paramsP }: { params: Promise<{ token: string }> }) {
  if (await tropDeRequetes(ipDe(req), 20, 10 * 60 * 1000, 'payer')) return page('Trop de demandes', 'Merci de réessayer dans quelques minutes.', 429)
  const params = await paramsP
  const token = String(params.token || '')
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return page('Lien invalide', 'Ce lien de paiement n\'est pas valide.', 404)

  const { data: e } = await supabaseAdmin.from('echeances').select('*').eq('token', token).single()
  if (!e) return page('Lien invalide', 'Ce lien de paiement n\'est pas valide.', 404)
  if (e.statut === 'paye') return page('Déjà réglé', 'Ce versement a bien été reçu. Merci !')
  if (e.statut === 'annule') return page('Lien expiré', 'Ce versement a été annulé. Contactez-nous si besoin : contact@la-gabare.fr')
  if (e.statut === 'a_venir') return page('Pas encore disponible', 'Ce versement n\'est pas encore à régler. Vous recevrez un e-mail le moment venu.')

  try {
    const url = await ouvrirPaiement(e as Echeance)
    return NextResponse.redirect(url, 303)
  } catch (err) {
    console.error('payer', err)
    return page('Paiement indisponible', 'Le paiement est momentanément indisponible. Réessayez dans quelques minutes ou écrivez-nous : contact@la-gabare.fr', 503)
  }
}
