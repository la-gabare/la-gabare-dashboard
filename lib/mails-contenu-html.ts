import { gabaritMail, SANS, SERIF } from '@/lib/mail-cadre'
// Gabarit HTML des mails de contenu : charte de la-gabare.fr (crème #F5F2EC, noir #1A1310, bordeaux #5A1226, or #B08D57).
// Pur (aucun accès base ni réseau) pour pouvoir être testé et prévisualisé.

export type Ligne = { date: string; type: 'Article' | 'Publication'; titre: string; valide?: boolean }

const sans = SANS
const serif = SERIF
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

const jour = (d: string) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric' })
const moisCourt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', month: 'short' }).replace('.', '')
const jourSemaine = (d: string) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long' })

function ligne(l: Ligne) {
  const publication = l.type === 'Publication'
  return `<tr><td style="padding:0 0 12px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F2EC;border:1px solid rgba(26,19,16,0.07);border-radius:3px;border-left:3px solid ${publication ? '#B08D57' : '#5A1226'};"><tr>
<td width="76" align="center" style="padding:14px 8px;border-right:1px solid rgba(26,19,16,0.08);">
  <div style="${serif};font-size:28px;font-weight:500;font-style:italic;line-height:1;color:#B08D57;">${jour(l.date)}</div>
  <div style="${sans};font-size:10px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;color:#4A3E37;margin-top:6px;">${esc(moisCourt(l.date))}</div>
</td>
<td style="padding:14px 18px;">
  <div style="${sans};font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${publication ? '#B08D57' : '#5A1226'};">${l.type} · ${esc(jourSemaine(l.date))}${l.valide ? ' · validé' : ''}</div>
  <div style="${serif};font-size:20px;font-weight:500;line-height:1.3;color:#1A1310;margin-top:4px;">${esc(l.titre)}</div>
</td></tr></table></td></tr>`
}

// Charte e-mail (lib/mail-cadre.ts) ; bloc « À très vite » du modèle Bienvenue, sans signature automatique
export function mailContenu(o: { surtitre: string; titre: string; intro: string; lignes: Ligne[]; pied: string; bouton: string; lien: string }) {
  const para = (t: string) => `<p style="margin:0 0 20px 0;">${t}</p>`
  return gabaritMail({
    label: o.surtitre,
    titre: o.titre,
    corps: `${para('Bonjour,')}${para(o.intro)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px 0;">${o.lignes.map(ligne).join('')}</table>
${para(o.pied)}`,
    bouton: { texte: `${o.bouton} &rarr;`, lien: o.lien },
    signature: 'a-tres-vite',
  })
}
