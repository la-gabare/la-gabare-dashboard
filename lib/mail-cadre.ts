// Charte e-mail La Gabare (novembre 2026, modèles Paiement / Bienvenue / Newsletter / Signature).
// UN SEUL endroit pour le design de tous les e-mails envoyés aux clients et prospects : `gabaritMail()`.
// HTML d'e-mail robuste : tables, styles en ligne, ni flex ni SVG, images en https://admin.la-gabare.fr/mail/…
// Pur (aucun accès base ni réseau) : testable et prévisualisable (scripts/apercu-mails.ts).

export const SERIF = "font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif"
export const SANS = "font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif"

// Couleurs de la charte
export const C = {
  fond: '#EDE9E2', creme: '#F5F2EC', encre: '#1A1310', texte: '#4A3E37', or: '#B08D57',
  bordeaux: '#5A1226', nuit: '#2A0810', discret: '#7A6F66', bord: 'rgba(26,19,16,0.07)', filet: 'rgba(26,19,16,0.14)',
}

// Marqueurs lus par avecSignature() (lib/signature-mail.ts) : la signature automatique se place DANS la carte,
// ou n'est pas ajoutée quand le mail porte déjà le bloc « À très vite ».
export const MARQUE_SIGNATURE = '<!--gabare:signature-->'
export const MARQUE_SANS_SIGNATURE = '<!--gabare:sans-signature-->'

// Styles en ligne réutilisables dans le corps
export const STYLE_P = `margin:0 0 16px 0;${SANS};font-size:14px;font-weight:300;line-height:1.7;color:${C.texte};`
export const STYLE_FORT = `color:${C.encre};font-weight:600;`
export const STYLE_PETIT = `margin:0;${SANS};font-size:13px;font-weight:300;line-height:1.6;color:${C.texte};`
export const STYLE_LIEN = `color:${C.bordeaux};font-weight:500;text-decoration:none;`

export const p = (html: string, marge = '0 0 16px 0') => `<p style="${STYLE_P}margin:${marge};">${html}</p>`

// Petit label doré en majuscules (comme « Votre paiement »), utilisable comme intertitre
export const labelMail = (t: string, marge = '28px 0 12px 0') =>
  `<p style="margin:${marge};${SANS};font-size:11px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:${C.or};">${t}</p>`

export const listeMail = (items: string[]) =>
  `<ul style="margin:0 0 20px 0;padding-left:20px;${SANS};font-size:14px;font-weight:300;line-height:1.7;color:${C.texte};">${items.map((i) => `<li style="margin-bottom:6px;">${i}</li>`).join('')}</ul>`

// Bouton plein (bordeaux) ou secondaire (contour), tableau pour Outlook
export function boutonMail(texte: string, lien: string, o: { secondaire?: boolean; marge?: string } = {}) {
  const fond = o.secondaire ? 'transparent' : C.bordeaux
  const couleur = o.secondaire ? C.encre : C.creme
  const bord = o.secondaire ? `border:1px solid ${C.encre};` : `border:1px solid ${C.bordeaux};`
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:${o.marge ?? '8px 0 0 0'};"><tr><td style="border-radius:3px;background-color:${fond};">
<a href="${lien}" style="display:inline-block;padding:14px 32px;${bord}border-radius:3px;background-color:${fond};color:${couleur};${SANS};font-size:13px;font-weight:500;letter-spacing:0.3px;line-height:1.2;text-decoration:none;">${texte}</a>
</td></tr></table>`
}

// Carte crème (fond #F5F2EC, bord léger, coins 3 px), comme le bloc Montant ou les articles de la Newsletter
export function carteMail(html: string, o: { marge?: string; bordGauche?: string; padding?: string } = {}) {
  const gauche = o.bordGauche ? `border-left:3px solid ${o.bordGauche};` : ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:${o.marge ?? '0 0 16px 0'};border-collapse:separate;"><tr>
<td style="background-color:${C.creme};border:1px solid ${C.bord};${gauche}border-radius:3px;padding:${o.padding ?? '20px 24px'};${SANS};font-size:14px;font-weight:300;line-height:1.7;color:${C.texte};">${html}</td></tr></table>`
}

// Titre de carte en Cormorant (22 px, comme les articles de la Newsletter)
export const titreCarte = (t: string, marge = '0 0 8px 0') =>
  `<p style="margin:${marge};${SERIF};font-size:22px;font-weight:500;line-height:1.3;color:${C.encre};">${t}</p>`

// Bloc « Montant » du modèle Paiement : deux colonnes (libellé + valeur)
export function montantMail(gauche: { label: string; valeur: string }, droite?: { label: string; valeur: string }) {
  const lab = (t: string) => `<p style="margin:0 0 6px 0;${SANS};font-size:11px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;color:${C.texte};">${t}</p>`
  return carteMail(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle">${lab(gauche.label)}<p style="margin:0;${SERIF};font-size:34px;font-weight:600;line-height:1.1;letter-spacing:-0.5px;color:${C.encre};">${gauche.valeur}</p></td>
${droite ? `<td valign="middle" align="right" style="text-align:right;">${lab(droite.label)}<p style="margin:0;${SANS};font-size:14px;font-weight:500;color:${C.encre};">${droite.valeur}</p></td>` : ''}
</tr></table>`, { marge: '24px 0 24px 0' })
}

// Étapes 01 / 02 / 03 du modèle Bienvenue (chiffres Cormorant italique doré, filets entre les étapes)
export function etapesMail(etapes: { titre: string; texte: string }[]) {
  const lignes = etapes.map((e, i) => `${i ? `<tr><td></td><td style="padding:0;"><div style="height:1px;line-height:1px;font-size:0;background-color:${C.bord};margin:0 0 18px 0;">&nbsp;</div></td></tr>` : ''}<tr>
<td width="44" valign="top" style="padding:0 0 18px 0;${SERIF};font-size:28px;font-weight:500;font-style:italic;line-height:1;color:${C.or};">${String(i + 1).padStart(2, '0')}</td>
<td valign="top" style="padding:0 0 18px 0;"><p style="margin:0 0 3px 0;${SANS};font-size:13px;font-weight:600;color:${C.encre};">${e.titre}</p>${e.texte ? `<p style="margin:0;${SANS};font-size:12px;font-weight:300;line-height:1.5;color:${C.texte};">${e.texte}</p>` : ''}</td></tr>`).join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px 0;">${lignes}</table>`
}

// Bloc « À très vite » du modèle Bienvenue
export function aTresVite(o: { nom?: string; role?: string } = {}) {
  const nom = o.nom ?? 'Alexandre Bruzailles'
  const role = o.role === undefined ? 'La Gabare · Fondateur' : o.role
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:40px 0 0 0;"><tr><td style="border-top:1px solid ${C.filet};padding:24px 0 0 0;">
<p style="margin:0 0 4px 0;${SANS};font-size:13px;font-weight:300;font-style:italic;color:${C.texte};">À très vite,</p>
<p style="margin:0;${SANS};font-size:14px;font-weight:500;color:${C.encre};">${nom}</p>
${role ? `<p style="margin:4px 0 0 0;${SANS};font-size:11px;font-weight:500;letter-spacing:1px;color:${C.or};">${role}</p>` : ''}
</td></tr></table>`
}

export const ENTETE_MAIL = `<tr><td align="center" style="background-color:${C.nuit};padding:24px 40px;text-align:center;"><img src="https://admin.la-gabare.fr/mail/logo-pastille.png" width="44" height="44" alt="" style="display:inline-block;vertical-align:middle;border:0;"><span style="${SERIF};font-size:24px;font-weight:500;letter-spacing:1px;color:${C.creme};vertical-align:middle;">&nbsp;&nbsp;La Gabare</span></td></tr>
<tr><td style="height:2px;background-color:${C.or};background-image:linear-gradient(90deg,#B08D57 0%,#C9A971 50%,#B08D57 100%);font-size:0;line-height:0;">&nbsp;</td></tr>`

export const PIED_MAIL = `<tr><td align="center" style="background-color:${C.nuit};padding:24px 40px;text-align:center;"><p style="margin:0;${SANS};font-size:11px;font-weight:500;letter-spacing:1.5px;color:${C.or};">La Gabare — Agence web pour domaines viticoles</p><p style="margin:8px 0 0 0;${SANS};font-size:11px;color:#7B6668;"><a href="https://la-gabare.fr" style="color:#7B6668;text-decoration:none;">la-gabare.fr</a> · <a href="mailto:contact@la-gabare.fr" style="color:#7B6668;text-decoration:none;">contact@la-gabare.fr</a></p></td></tr>`

const POLICES = '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">'

export interface OptionsMail {
  label: string // petit label doré (« Votre paiement »)
  titre: string // titre Cormorant 30 px (HTML déjà échappé)
  corps: string // HTML du corps (paragraphes, cartes, listes…)
  bouton?: { texte: string; lien: string; secondaire?: boolean }
  apresBouton?: string // HTML sous le bouton (mention, second bouton…)
  // 'auto' (défaut) : signature d'Alexandre avec photo, ajoutée par sendMail DANS la carte (si le mail part au nom de La Gabare).
  // 'a-tres-vite' : bloc « À très vite » du modèle Bienvenue, sans signature automatique.
  signature?: 'auto' | 'a-tres-vite'
  signataire?: { nom?: string; role?: string } // pour le bloc « À très vite »
}

// Page complète de la charte : fond #EDE9E2, carte 600 px, bandeau, corps (label, titre, filet, texte), bouton, signature, pied.
export function gabaritMail(o: OptionsMail): string {
  const bouton = o.bouton ? boutonMail(o.bouton.texte, o.bouton.lien, { secondaire: o.bouton.secondaire, marge: '16px 0 0 0' }) : ''
  const fin = o.signature === 'a-tres-vite' ? aTresVite(o.signataire) + MARQUE_SANS_SIGNATURE : MARQUE_SIGNATURE
  return `${POLICES}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.fond};"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${C.fond};border:1px solid ${C.bord};">
${ENTETE_MAIL}
<tr><td style="padding:48px 40px 40px 40px;${SANS};font-size:14px;font-weight:300;line-height:1.7;color:${C.texte};">
<p style="margin:0 0 16px 0;${SANS};font-size:11px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:${C.or};">${o.label}</p>
<h1 style="margin:0 0 24px 0;${SERIF};font-size:30px;font-weight:500;line-height:1.3;letter-spacing:-0.5px;color:${C.encre};">${o.titre}</h1>
<div style="width:48px;height:1px;line-height:1px;font-size:0;background-color:${C.filet};margin:0 0 24px 0;">&nbsp;</div>
${o.corps}
${bouton}
${o.apresBouton ?? ''}
${fin}
</td></tr>
${PIED_MAIL}
</table>
</td></tr></table>`
}
