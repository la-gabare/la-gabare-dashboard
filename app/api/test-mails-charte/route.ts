import { NextResponse } from 'next/server'
import { sendMail, paymentLinkEmail } from '@/lib/mailer'
import { mailPriseDeContact } from '@/lib/leads/mails'
import { mailGabarit } from '@/lib/paiements/devis'

export const dynamic = 'force-dynamic'

// Essai de l'affichage des e-mails (charte novembre 2026) : envoie 3 exemples [ESSAI] UNIQUEMENT à l'adresse de l'agence
// (SMTP_USER), jamais à un client. Route protégée par la connexion de l'admin ; ne modifie aucune donnée.
export async function GET() {
  const to = process.env.SMTP_USER
  if (!to) return NextResponse.json({ error: 'SMTP_USER absent' }, { status: 500 })
  const opts = { fromName: 'La Gabare', signature: true }
  await sendMail(to, '[ESSAI] Lien de paiement', paymentLinkEmail('Domaine des Naigles', 1990, 'site', 'https://la-gabare.fr'), opts)
  await sendMail(to, '[ESSAI] Prise de contact', mailPriseDeContact({ nom: 'Camille', email: to, domaine: 'Domaine des Naigles', pack_demande: 'Essentiel', lead_id: null }), opts)
  await sendMail(to, '[ESSAI] Devis', mailGabarit('Votre devis', 'Domaine des Naigles, voici notre proposition.',
    '<p style="margin:0 0 16px 0;">Exemple de mail avec bouton : montant <strong style="color:#1A1310;">1 990,00 €</strong>.</p>',
    { texte: 'Voir et accepter le devis', lien: 'https://la-gabare.fr' }), opts)
  return NextResponse.json({ ok: true, envoye_a: to })
}
