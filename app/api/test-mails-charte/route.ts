import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/mailer'
import { mails } from '@/lib/mails-exemples'

export const dynamic = 'force-dynamic'

// Essai de l'affichage des e-mails (charte novembre 2026) : envoie des exemples [ESSAI] (fausses données) UNIQUEMENT à l'adresse
// de l'agence (SMTP_USER), jamais à un client. /api/test-mails-charte?debut=0&nb=8 envoie les mails 1 à 8 de la liste (par lots, pour
// rester sous la limite de durée) ; sans paramètre : le premier lot. Route protégée par la connexion de l'admin ; ne modifie aucune donnée.
export async function GET(req: NextRequest) {
  const to = process.env.SMTP_USER
  if (!to) return NextResponse.json({ error: 'SMTP_USER absent' }, { status: 500 })
  const debut = Math.max(0, Number(req.nextUrl.searchParams.get('debut')) || 0)
  const nb = Math.min(10, Math.max(1, Number(req.nextUrl.searchParams.get('nb')) || 8))
  const lot = mails.slice(debut, debut + nb)
  for (const [i, [sujet, html, de]] of lot.entries()) {
    await sendMail(to, `[ESSAI ${debut + i + 1}/${mails.length}] ${sujet}`, html, { fromName: de || 'La Gabare', signature: !de })
  }
  return NextResponse.json({ ok: true, envoye_a: to, de: debut + 1, a: debut + lot.length, total: mails.length })
}
