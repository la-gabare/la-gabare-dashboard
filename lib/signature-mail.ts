// Signature d'Alexandre ajoutée en bas des e-mails envoyés au nom de La Gabare (clients, prospects).
// Les images sont dans public/mail/ (adresses publiques, voir middleware.ts).
const BASE = 'https://admin.la-gabare.fr/mail'

export const SIGNATURE_HTML = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin-top:28px;">
  <tr><td colspan="3" style="padding:0 0 16px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="48" height="2" style="width:48px;height:2px;line-height:2px;font-size:0;background:#5A1226;">&nbsp;</td><td width="24" height="2" style="width:24px;height:2px;line-height:2px;font-size:0;background:#B08D57;">&nbsp;</td></tr></table></td></tr>
  <tr>
    <td width="84" style="vertical-align:top;padding:0 20px 0 0;"><img src="${BASE}/photo-carre.png" width="64" height="64" alt="Alexandre Bruzailles" style="display:block;width:64px;height:64px;border-radius:3px;"></td>
    <td style="vertical-align:top;">
      <div style="font-size:14px;font-weight:bold;color:#1A1310;margin:0 0 2px 0;">Alexandre Bruzailles</div>
      <div style="font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#B08D57;margin:0 0 12px 0;">La Gabare · Fondateur</div>
      <div style="font-size:11px;line-height:18px;color:#4A3E37;">
        <a href="mailto:contact@la-gabare.fr" style="color:#4A3E37;text-decoration:none;">contact@la-gabare.fr</a><br>
        19 ter rue de l'Europe, 37150 Francueil<br>
        <a href="https://la-gabare.fr" style="color:#5A1226;text-decoration:none;font-weight:bold;">la-gabare.fr</a>
      </div>
    </td>
    <td width="72" align="center" style="vertical-align:middle;"><img src="${BASE}/logo-gabare.png" width="56" height="35" alt="La Gabare" style="display:block;width:56px;height:35px;"></td>
  </tr>
</table>`

// Mail envoyé au nom de La Gabare (et non d'un domaine client) vers un destinataire externe : on ajoute la signature.
export function avecSignature(html: string, to: string, fromName?: string, signature?: boolean): string {
  if (signature === false) return html
  const interne = [process.env.AGENCE_NOTIF_EMAIL, process.env.SMTP_USER].filter(Boolean).map((a) => a!.toLowerCase())
  const nomAgence = !fromName || fromName.trim() === 'La Gabare'
  if (signature !== true && (!nomAgence || interne.includes(to.trim().toLowerCase()))) return html
  return html + SIGNATURE_HTML
}
