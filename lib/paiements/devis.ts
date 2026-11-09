import 'server-only'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { ADMIN_URL, FORMULES, euros } from '@/lib/paiements/echeancier'
import { gabaritMail } from '@/lib/mail-cadre'

// Identité de l'agence sur les devis — à compléter dans Vercel une fois l'entreprise créée
export const AGENCE = {
  nom: process.env.AGENCE_RAISON_SOCIALE || 'La Gabare',
  adresse: process.env.AGENCE_ADRESSE || '',
  siret: process.env.AGENCE_SIRET || '',
  iban: process.env.AGENCE_IBAN || '',
  email: process.env.AGENCE_NOTIF_EMAIL || process.env.SMTP_USER || 'contact@la-gabare.fr',
}

// Taux de TVA en % ; 0 = franchise en base (micro-entreprise)
export const TVA_PCT = Number(process.env.AGENCE_TVA_TAUX ?? 20)

export const CATALOGUE: Record<string, { libelle: string; detail: string; prix: number }> = {
  essentiel: { libelle: 'Pack Essentiel', detail: "Site vitrine 5 pages, textes rédigés, conforme loi Évin, référencement local — 3 mois d'accompagnement Village inclus (valeur 450 €)", prix: 1990 },
  pro: { libelle: 'Pack Pro', detail: "Site complet avec boutique en ligne et espace professionnels, textes rédigés — 3 mois d'accompagnement Réserve inclus (valeur 1 050 €)", prix: 4490 },
  premium: { libelle: 'Pack Premium', detail: "Pack Pro + sommelier IA, réservation de visites avec acompte, deux langues (fonctions en cours de développement : livrées dès leur mise au point, calendrier précisé à la commande) — 3 mois d'accompagnement Grand Cru inclus (valeur 1 650 €)", prix: 6990 },
  traduction: { libelle: 'Option traduction', detail: 'Traduction du site dans une langue supplémentaire', prix: 350 },
  audit: { libelle: 'Option audit de réputation', detail: 'Analyse des avis et de la présence en ligne, plan d\'action', prix: 250 },
}

// Pack site vendu par un devis, d'après ses lignes (« Pack Essentiel / Pro / Premium » du catalogue) ; null s'il n'y en a pas ou plusieurs
export function packDuDevis(lignes: { libelle: string }[]): string | null {
  const packs = new Set<string>()
  for (const l of lignes) {
    const m = /^pack\s+(essentiel|pro|premium)\b/i.exec(l.libelle.trim())
    if (m) packs.add(m[1].toLowerCase())
  }
  return packs.size === 1 ? [...packs][0] : null
}

export interface LigneDevis { libelle: string; detail?: string; montant_ht_cents: number }

export function calculer(lignes: LigneDevis[], formule: string, remisePct: number, tvaPct = TVA_PCT) {
  const brut = lignes.reduce((s, l) => s + l.montant_ht_cents, 0)
  const remise = formule === '1x' ? Math.round((brut * remisePct) / 100) : 0
  const ht = brut - remise
  const ttc = Math.round(ht * (1 + tvaPct / 100))
  return { brut, remise, ht, tva: ttc - ht, ttc }
}

export async function prochainNumero() {
  const annee = new Date().getFullYear()
  const { count } = await supabaseAdmin.from('devis').select('id', { count: 'exact', head: true }).like('numero', `D-${annee}-%`)
  return `D-${annee}-${String((count || 0) + 1).padStart(3, '0')}`
}

export const nouveauToken = () => crypto.randomBytes(24).toString('base64url')
export const lienDevis = (token: string) => `${ADMIN_URL}/api/public/devis/${token}`

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const dateFr = (d: string | Date) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export interface Devis {
  id: number
  client_id: number
  numero: string
  lignes: LigneDevis[]
  remise_pct: number
  total_ht_cents: number
  tva_pct: number
  total_ttc_cents: number
  formule: string
  validite: string
  statut: string
  token: string
  accepte_at: string | null
  accepte_nom: string | null
  created_at: string
}

// Corps du devis (page d'acceptation et impression PDF)
export function htmlDevis(d: Devis, client: { nom_domaine: string; email_contact: string | null }) {
  const t = calculer(d.lignes, d.formule, Number(d.remise_pct), Number(d.tva_pct))
  const f = FORMULES[d.formule]
  let reste = d.total_ttc_cents
  const versements = f.parts.map(([libelle, pct], i) => {
    const m = i === f.parts.length - 1 ? reste : Math.round((d.total_ttc_cents * pct) / 100)
    reste -= m
    return `<tr><td>${esc(libelle)}${f.parts.length > 1 ? ` (${pct} %)` : ''}</td><td class="num">${euros(m)}</td></tr>`
  }).join('')
  const lignes = d.lignes.map((l) => `<tr><td><strong>${esc(l.libelle)}</strong>${l.detail ? `<br><span class="muted">${esc(l.detail)}</span>` : ''}</td><td class="num">${euros(l.montant_ht_cents)}</td></tr>`).join('')
  const tvaLigne = Number(d.tva_pct) > 0
    ? `<tr><td>TVA ${d.tva_pct} %</td><td class="num">${euros(t.tva)}</td></tr><tr class="total"><td>Total TTC</td><td class="num">${euros(t.ttc)}</td></tr>`
    : `<tr class="total"><td>Total</td><td class="num">${euros(t.ttc)}</td></tr><tr><td colspan="2" class="muted">TVA non applicable, art. 293 B du CGI</td></tr>`
  return `<div class="devis">
  <div class="entete">
    <div><p class="marque">La Gabare</p><p class="muted">${esc(AGENCE.nom)}${AGENCE.adresse ? `<br>${esc(AGENCE.adresse)}` : ''}${AGENCE.siret ? `<br>SIRET ${esc(AGENCE.siret)}` : ''}${AGENCE.iban ? `<br>IBAN ${esc(AGENCE.iban)}` : ''}<br>${esc(AGENCE.email)}</p></div>
    <div class="droite"><p class="titre">Devis ${esc(d.numero)}</p><p class="muted">Émis le ${dateFr(d.created_at)}<br>Valable jusqu'au ${dateFr(d.validite)}</p></div>
  </div>
  <p class="pour"><span class="muted">Pour</span><br><strong>${esc(client.nom_domaine)}</strong><br>${esc(client.email_contact || '')}</p>
  <table>
    <thead><tr><th>Prestation</th><th class="num">Montant HT</th></tr></thead>
    <tbody>${lignes}
      ${t.remise ? `<tr><td>Remise paiement comptant (${d.remise_pct} %)</td><td class="num">− ${euros(t.remise)}</td></tr>` : ''}
      <tr><td>Total HT</td><td class="num">${euros(t.ht)}</td></tr>
      ${tvaLigne}
    </tbody>
  </table>
  <h3>Règlement — ${esc(f.nom.toLowerCase())}</h3>
  <table><tbody>${versements}</tbody></table>
  <p class="muted">Paiement par carte bancaire ou virement. Les délais de réalisation courent à compter de la réception de l'acompte
  et de l'ensemble des contenus nécessaires. Le versement à la commande constitue un acompte, acquis en cas d'annulation du fait du client.
  Conditions générales de vente : <a href="https://la-gabare.fr/cgv.html" target="_blank" rel="noopener">la-gabare.fr/cgv.html</a>.</p>
</div>`
}

export const STYLE_DEVIS = `
.devis{font-family:Arial,sans-serif;color:#1A1310;font-size:14px;line-height:1.55}
.devis .entete{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:28px}
.devis .marque{font-family:Georgia,serif;font-size:26px;margin:0 0 6px}
.devis .titre{font-family:Georgia,serif;font-size:22px;margin:0 0 6px}
.devis .droite{text-align:right}
.devis .muted{color:#6b5f57;font-size:13px}
.devis .pour{margin:0 0 24px}
.devis table{width:100%;border-collapse:collapse;margin-bottom:20px}
.devis th{text-align:left;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6b5f57;border-bottom:1px solid #d8d0c4;padding:8px 0}
.devis td{padding:10px 0;border-bottom:1px solid #ebe5dc;vertical-align:top}
.devis .num{text-align:right;white-space:nowrap;padding-left:16px}
.devis .total td{font-weight:700;font-size:16px}
.devis h3{font-family:Georgia,serif;font-weight:400;font-size:18px;margin:8px 0 6px}
.devis a{color:#5A1226}
@media (max-width:520px){.devis .droite{text-align:left}}
`

// Mails La Gabare des devis / paiements : gabarit unique de la charte (lib/mail-cadre.ts)
export function mailGabarit(surtitre: string, titre: string, corps: string, bouton?: { texte: string; lien: string },
  signature: 'auto' | 'a-tres-vite' = 'auto') {
  return gabaritMail({ label: surtitre, titre, corps, signature,
    bouton: bouton ? { texte: `${bouton.texte} &rarr;`, lien: bouton.lien } : undefined })
}

// Relances : 1 = quelques jours après l'envoi, 2 = une semaine après, 3 = juste avant l'expiration
const RELANCES_DEVIS: Record<number, (d: Devis) => string> = {
  1: () => 'Avez-vous pu consulter notre proposition ? Nous restons disponibles pour en parler ou l\'ajuster à votre projet.',
  2: () => 'Votre projet nous tient à cœur : si un point vous fait hésiter (budget, calendrier, contenu des pages), répondez simplement à ce message et nous trouverons la bonne formule ensemble.',
  3: (d) => `Votre devis arrive à échéance le ${dateFr(d.validite)}. Pour conserver ces conditions, il suffit de l'accepter en ligne avant cette date.`,
}

// HTML du mail de devis (ou de sa relance n° 1 à 3) : pur, prévisualisable
export function mailDevis(d: Devis, nomDomaine: string, relance = 0) {
  if (relance && RELANCES_DEVIS[relance]) {
    return mailGabarit(
      'Votre devis', `${esc(nomDomaine)}, un petit mot.`,
      `<p style="margin:0 0 16px 0;">${RELANCES_DEVIS[relance](d)}</p>
       <p style="margin:0 0 24px 0;">Rappel : ${euros(d.total_ttc_cents)}, ${esc(FORMULES[d.formule].nom.toLowerCase())}, valable jusqu'au ${dateFr(d.validite)}.</p>`,
      { texte: 'Revoir le devis', lien: lienDevis(d.token) })
  }
  return mailGabarit(
    'Votre devis', `${esc(nomDomaine)}, voici notre proposition.`,
    `<p style="margin:0 0 16px 0;">Merci pour notre échange. Vous trouverez votre devis en ligne : montant <strong style="color:#1A1310;">${euros(d.total_ttc_cents)}</strong>,
     ${esc(FORMULES[d.formule].nom.toLowerCase())}, valable jusqu'au ${dateFr(d.validite)}.</p>
     <p style="margin:0 0 24px 0;">Vous pouvez le télécharger en PDF, et l'accepter en ligne en un clic : vous serez alors dirigé vers le paiement de l'acompte,
     par carte ou par virement.</p>`,
    { texte: 'Voir et accepter le devis', lien: lienDevis(d.token) })
}

export async function envoyerDevis(d: Devis, relance = 0) {
  const { data: client } = await supabaseAdmin.from('clients').select('nom_domaine, email_contact').eq('id', d.client_id).single()
  if (!client?.email_contact) throw new Error('Ce client n\'a pas d\'adresse e-mail')
  if (relance && RELANCES_DEVIS[relance]) {
    await sendMail(client.email_contact, `${relance === 3 ? 'Dernier rappel' : 'Rappel'} — votre devis ${d.numero} · ${client.nom_domaine}`,
      mailDevis(d, client.nom_domaine, relance), { fromName: 'La Gabare', replyTo: AGENCE.email })
    return
  }
  await sendMail(client.email_contact, `Votre devis ${d.numero} — ${client.nom_domaine}`, mailDevis(d, client.nom_domaine),
    { fromName: 'La Gabare', replyTo: AGENCE.email })
}

// HTML du mail de bienvenue (contenus à fournir selon le pack) : pur, prévisualisable. Bloc « À très vite » (modèle Bienvenue).
export function mailAccueil(nomDomaine: string, packSite: string | null | undefined, limite: string) {
  const pack = String(packSite || '').toLowerCase()
  const elements = [
    'Votre logo (fichier d\'origine si possible : PDF, SVG ou PNG haute définition)',
    'Des photos du domaine, des vignes, du chai et de l\'équipe — même prises au téléphone, nous trions',
    'La liste de vos cuvées avec, si vous les avez, les fiches techniques et photos de bouteilles',
    'Quelques lignes sur votre histoire, votre façon de travailler et ce qui vous distingue : nous rédigeons les textes à partir de là',
    'Le nom de domaine souhaité (ou l\'accès à celui que vous possédez déjà)',
    'Vos informations légales : raison sociale, adresse, SIRET, et numéro d\'entrepositaire agréé si vous vendez en ligne',
    ...(pack === 'pro' || pack === 'premium' ? ['Vos tarifs (particuliers et professionnels), frais de port et conditions de retrait au caveau'] : []),
    ...(pack === 'premium' ? ['Vos créneaux de visite et de dégustation, avec le montant de l\'acompte souhaité'] : []),
  ]
  return mailGabarit(
    'Bienvenue', `Merci, ${esc(nomDomaine)}.`,
    `<p style="margin:0 0 16px 0;">Votre acompte est bien reçu : votre projet démarre. Pour avancer, nous avons besoin des éléments suivants,
     idéalement avant le <strong style="color:#1A1310;">${limite}</strong> :</p>
     <ul style="margin:0 0 20px 0;padding-left:20px;">${elements.map((e) => `<li style="margin-bottom:6px;">${esc(e)}</li>`).join('')}</ul>
     <p style="margin:0 0 16px 0;">Votre espace client vient d'être créé : vous allez recevoir un second e-mail d'activation de votre compte (pensez à vérifier vos courriers indésirables). Cliquez sur le lien qu'il contient pour choisir votre mot de passe. Vous y trouverez ensuite la liste
     de ces éléments, rubrique « Votre projet » : répondez directement en ligne, déposez vos photos dans la « Galerie photo », et cochez au fur et à mesure.</p>
     <p style="margin:0 0 8px 0;">Il vous manque quelque chose ? Pas d'inquiétude : envoyez ce que vous avez, nous complétons ensemble.</p>`,
    undefined, 'a-tres-vite')
}

// Contenus à fournir, selon le pack, envoyés au premier paiement
export async function envoyerAccueil(clientId: number) {
  const { data: client } = await supabaseAdmin.from('clients')
    .select('id, nom_domaine, email_contact, pack_site, accueil_envoye_at').eq('id', clientId).single()
  if (!client?.email_contact || client.accueil_envoye_at) return
  const limite = dateFr(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
  await sendMail(client.email_contact, `Bienvenue — lançons le site de ${client.nom_domaine}`, mailAccueil(client.nom_domaine, client.pack_site, limite),
    { fromName: 'La Gabare', replyTo: AGENCE.email })
  // Date souhaitée pour les contenus : point de départ des relances automatiques
  const dateLimite = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  await supabaseAdmin.from('clients').update({ accueil_envoye_at: new Date().toISOString(), contenus_limite: dateLimite }).eq('id', client.id)
}
