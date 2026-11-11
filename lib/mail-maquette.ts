// Mail « Votre maquette » envoyé à un prospect push : message type modifiable, mis en page avec la charte.
// Rien ne part sans aperçu puis validation explicite de Louis (voir /api/prospects/envoyer-maquette).
import { gabaritMail, p } from '@/lib/mail-cadre'

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
export const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/

export interface ProspectMail { nom: string; appellation?: string | null; commune?: string | null }

export const objetParDefaut = (nom: string) => `Une maquette de site pour ${nom}`

// Message type : la première ligne est faite pour être personnalisée.
export function messageParDefaut(pr: ProspectMail): string {
  const lieu = [pr.appellation, pr.commune].filter(Boolean).join(', ')
  return `Bonjour,

J'ai découvert ${pr.nom}${lieu ? ` (${lieu})` : ''} et j'ai pris le temps d'imaginer ce que pourrait être votre site. [Ajoutez ici une phrase personnelle.]

Vous trouverez ci-dessous une maquette, préparée sans aucun engagement. Elle n'est pas publiée : elle n'existe que pour vous la montrer.

La Gabare est une agence web réservée aux domaines viticoles de la Loire. Si la maquette vous parle, je serais ravi d'en discuter lors d'un court échange, quand cela vous arrange.

Belle journée à vous,`
}

// Texte brut -> paragraphes HTML (lignes vides = nouveau paragraphe, retours à la ligne conservés).
export function messageEnHtml(message: string): string {
  return message.trim().split(/\n{2,}/).map((bloc) => p(esc(bloc.trim()).replace(/\n/g, '<br>'))).join('\n')
}

export interface MaquetteMail { bureau: string | null; mobile: string | null; lien?: string | null }

// srcBureau / srcMobile : « cid:... » à l'envoi, adresse de l'admin dans l'aperçu.
export function htmlMailMaquette(pr: ProspectMail, message: string, m: { srcBureau?: string; srcMobile?: string; lien?: string | null }): string {
  const img = (src: string, largeur: number) =>
    `<img src="${esc(src)}" width="${largeur}" alt="Maquette du site" style="display:block;width:100%;max-width:${largeur}px;height:auto;border:1px solid #D9D2C5;margin:0 0 12px 0;">`
  const images = [m.srcBureau && img(m.srcBureau, 520), m.srcMobile && img(m.srcMobile, 160)].filter(Boolean).join('\n')
  return gabaritMail({
    label: 'Votre maquette',
    titre: `Un site pour ${esc(pr.nom)}`,
    corps: `${messageEnHtml(message)}\n${images ? `<div style="margin:24px 0 8px 0;">${images}</div>` : ''}`,
    bouton: m.lien ? { texte: 'Voir la maquette en ligne', lien: m.lien } : undefined,
    apresBouton: p(`<span style="font-size:11px;">Pour ne plus recevoir de message de La Gabare, répondez simplement « stop ».</span>`, '24px 0 0 0'),
  })
}
