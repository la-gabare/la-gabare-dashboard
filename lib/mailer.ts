import 'server-only'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendMail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: `"La Gabare" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  })
}

export function paymentLinkEmail(nomDomaine: string, montant: number, type: 'site' | 'abonnement', paymentUrl: string) {
  const label = type === 'abonnement' ? `${montant}€ / mois` : `${montant}€`
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EDE9E2;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#F5F2EC;border:1px solid rgba(26,19,16,0.1);">
          <tr>
            <td style="background-color:#1A1310;padding:32px 40px;text-align:center;">
              <span style="font-family:Georgia,'Cormorant Garamond',serif;font-size:24px;letter-spacing:0.04em;color:#F5F2EC;">La Gabare</span>
            </td>
          </tr>
          <tr><td style="height:3px;background:linear-gradient(90deg,#5A1226,#B08D57);font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:44px 40px 24px 40px;">
              <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#B08D57;">Votre paiement</p>
              <h1 style="margin:0 0 20px 0;font-family:Georgia,'Cormorant Garamond',serif;font-weight:400;font-size:26px;color:#1A1310;">
                ${nomDomaine}, finalisons votre commande.
              </h1>
              <p style="margin:0 0 24px 0;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A3E37;">
                Voici le lien de paiement sécurisé pour votre ${type === 'abonnement' ? 'abonnement' : 'projet de site'}
                (<strong style="color:#1A1310;">${label}</strong>). Une fois le paiement confirmé, vous recevrez
                automatiquement l'accès à votre espace personnel.
              </p>
              <a href="${paymentUrl}" style="display:inline-block;padding:14px 32px;background-color:#5A1226;color:#F5F2EC;font-family:Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;">
                Procéder au paiement &rarr;
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color:#1A1310;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:rgba(245,242,236,0.5);">
                La Gabare — Agence pour les domaines viticoles de la Loire
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  `
}
