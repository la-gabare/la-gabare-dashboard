// Gabarit HTML des mails de contenu : charte de la-gabare.fr (crème #F5F2EC, noir #1A1310, bordeaux #5A1226, or #B08D57).
// Pur (aucun accès base ni réseau) pour pouvoir être testé et prévisualisé.

export type Ligne = { date: string; type: 'Article' | 'Publication'; titre: string; valide?: boolean }

const sans = 'font-family:Arial,Helvetica,sans-serif'
const serif = "font-family:Georgia,'Cormorant Garamond','Times New Roman',serif"
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

const jour = (d: string) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric' })
const moisCourt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', month: 'short' }).replace('.', '')
const jourSemaine = (d: string) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long' })

function ligne(l: Ligne) {
  const publication = l.type === 'Publication'
  return `<tr><td style="padding:0 0 12px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border:1px solid rgba(26,19,16,0.1);border-left:3px solid ${publication ? '#B08D57' : '#5A1226'};"><tr>
<td width="76" align="center" style="padding:14px 8px;border-right:1px solid rgba(26,19,16,0.08);">
  <div style="${serif};font-size:28px;line-height:1;color:#5A1226;">${jour(l.date)}</div>
  <div style="${sans};font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#7a6f66;margin-top:4px;">${esc(moisCourt(l.date))}</div>
</td>
<td style="padding:14px 18px;">
  <div style="${sans};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${publication ? '#B08D57' : '#5A1226'};">${l.type} · ${esc(jourSemaine(l.date))}${l.valide ? ' · validé' : ''}</div>
  <div style="${serif};font-size:18px;line-height:1.35;color:#1A1310;margin-top:4px;">${esc(l.titre)}</div>
</td></tr></table></td></tr>`
}

export function mailContenu(o: { surtitre: string; titre: string; intro: string; lignes: Ligne[]; pied: string; bouton: string; lien: string }) {
  const para = (t: string) => `<p style="margin:0 0 22px 0;${sans};font-size:15px;line-height:1.7;color:#4A3E37;">${t}</p>`
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EDE9E2;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#F5F2EC;border:1px solid rgba(26,19,16,0.1);">
<tr><td style="background-color:#1A1310;padding:32px 40px;text-align:center;"><span style="${serif};font-size:24px;letter-spacing:0.04em;color:#F5F2EC;">La Gabare</span></td></tr>
<tr><td style="height:3px;background:linear-gradient(90deg,#5A1226,#B08D57);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:40px 40px 36px 40px;">
  <p style="margin:0 0 6px 0;${sans};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#B08D57;">${o.surtitre}</p>
  <h1 style="margin:0 0 20px 0;${serif};font-weight:400;font-size:28px;line-height:1.25;color:#1A1310;">${o.titre}</h1>
  ${para('Bonjour,')}${para(o.intro)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px 0;">${o.lignes.map(ligne).join('')}</table>
  ${para(o.pied)}
  <a href="${o.lien}" style="display:inline-block;padding:14px 32px;background-color:#5A1226;color:#F5F2EC;${sans};font-size:15px;font-weight:600;text-decoration:none;">${o.bouton} &rarr;</a>
  <p style="margin:28px 0 0 0;${sans};font-size:14px;color:#4A3E37;">À très vite,<br><span style="${serif};font-size:17px;color:#1A1310;">L'équipe La Gabare</span></p>
</td></tr>
<tr><td style="background-color:#1A1310;padding:24px 40px;text-align:center;"><p style="margin:0;${sans};font-size:11px;color:rgba(245,242,236,0.5);">La Gabare — Agence pour les domaines viticoles de la Loire</p></td></tr>
</table></td></tr></table>`
}
