import 'server-only'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { ADMIN_URL, FORMULES, euros } from '@/lib/paiements/echeancier'

// Identité de l'agence sur les devis — à compléter dans Vercel une fois l'entreprise créée
export const AGENCE = {
  nom: process.env.AGENCE_RAISON_SOCIALE || 'La Gabare',
  adresse: process.env.AGENCE_ADRESSE || '',
  siret: process.env.AGENCE_SIRET || '',
  email: process.env.AGENCE_NOTIF_EMAIL || process.env.SMTP_USER || 'contact@la-gabare.fr',
}

// Taux de TVA en % ; 0 = franchise en base (micro-entreprise)
export const TVA_PCT = Number(process.env.AGENCE_TVA_TAUX ?? 20)

export const CATALOGUE: Record<string, { libelle: string; detail: string; prix: number }> = {
  essentiel: { libelle: 'Pack Essentiel', detail: 'Site vitrine 5 pages, textes rédigés, conforme loi Évin, référencement local', prix: 1990 },
  pro: { libelle: 'Pack Pro', detail: 'Site complet avec boutique en ligne et espace professionnels, textes rédigés', prix: 4490 },
  premium: { libelle: 'Pack Premium', detail: 'Pack Pro + sommelier IA, réservation de visites avec acompte, deux langues', prix: 6990 },
  traduction: { libelle: 'Option traduction', detail: 'Traduction du site dans une langue supplémentaire', prix: 350 },
  audit: { libelle: 'Option audit de réputation', detail: 'Analyse des avis et de la présence en ligne, plan d\'action', prix: 250 },
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
    <div><p class="marque">La Gabare</p><p class="muted">${esc(AGENCE.nom)}${AGENCE.adresse ? `<br>${esc(AGENCE.adresse)}` : ''}${AGENCE.siret ? `<br>SIRET ${esc(AGENCE.siret)}` : ''}<br>${esc(AGENCE.email)}</p></div>
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

function mailGabarit(surtitre: string, titre: string, corps: string, bouton?: { texte: string; lien: string }) {
  const sans = 'font-family:Arial,sans-serif'
  const serif = "font-family:Georgia,'Cormorant Garamond',serif"
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EDE9E2;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#F5F2EC;border:1px solid rgba(26,19,16,0.1);">
<tr><td style="background-color:#1A1310;padding:32px 40px;text-align:center;"><span style="${serif};font-size:24px;letter-spacing:0.04em;color:#F5F2EC;">La Gabare</span></td></tr>
<tr><td style="height:3px;background:linear-gradient(90deg,#5A1226,#B08D57);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:44px 40px 36px 40px;${sans};font-size:15px;line-height:1.7;color:#4A3E37;">
  <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#B08D57;">${surtitre}</p>
  <h1 style="margin:0 0 20px 0;${serif};font-weight:400;font-size:26px;color:#1A1310;">${titre}</h1>
  ${corps}
  ${bouton ? `<a href="${bouton.lien}" style="display:inline-block;margin-top:8px;padding:14px 32px;background-color:#5A1226;color:#F5F2EC;font-size:15px;font-weight:600;text-decoration:none;">${bouton.texte} &rarr;</a>` : ''}
</td></tr>
<tr><td style="background-color:#1A1310;padding:24px 40px;text-align:center;"><p style="margin:0;${sans};font-size:11px;color:rgba(245,242,236,0.5);">La Gabare — Agence pour les domaines viticoles de la Loire</p></td></tr>
</table></td></tr></table>`
}

export async function envoyerDevis(d: Devis) {
  const { data: client } = await supabaseAdmin.from('clients').select('nom_domaine, email_contact').eq('id', d.client_id).single()
  if (!client?.email_contact) throw new Error('Ce client n\'a pas d\'adresse e-mail')
  await sendMail(client.email_contact, `Votre devis ${d.numero} — ${client.nom_domaine}`, mailGabarit(
    'Votre devis', `${esc(client.nom_domaine)}, voici notre proposition.`,
    `<p style="margin:0 0 16px 0;">Merci pour notre échange. Vous trouverez votre devis en ligne : montant <strong style="color:#1A1310;">${euros(d.total_ttc_cents)}</strong>,
     ${esc(FORMULES[d.formule].nom.toLowerCase())}, valable jusqu'au ${dateFr(d.validite)}.</p>
     <p style="margin:0 0 24px 0;">Vous pouvez le télécharger en PDF, et l'accepter en ligne en un clic : vous serez alors dirigé vers le paiement de l'acompte,
     par carte ou par virement.</p>`,
    { texte: 'Voir et accepter le devis', lien: lienDevis(d.token) }), { fromName: 'La Gabare', replyTo: AGENCE.email })
}

// Contenus à fournir, selon le pack, envoyés au premier paiement
export async function envoyerAccueil(clientId: number) {
  const { data: client } = await supabaseAdmin.from('clients')
    .select('id, nom_domaine, email_contact, pack_site, accueil_envoye_at').eq('id', clientId).single()
  if (!client?.email_contact || client.accueil_envoye_at) return
  const pack = String(client.pack_site || '').toLowerCase()
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
  const limite = dateFr(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
  await sendMail(client.email_contact, `Bienvenue — lançons le site de ${client.nom_domaine}`, mailGabarit(
    'Bienvenue', `Merci, ${esc(client.nom_domaine)}.`,
    `<p style="margin:0 0 16px 0;">Votre acompte est bien reçu : votre projet démarre. Pour avancer, nous avons besoin des éléments suivants,
     idéalement avant le <strong style="color:#1A1310;">${limite}</strong> :</p>
     <ul style="margin:0 0 20px 0;padding-left:20px;">${elements.map((e) => `<li style="margin-bottom:6px;">${esc(e)}</li>`).join('')}</ul>
     <p style="margin:0 0 16px 0;">Vous allez recevoir un second e-mail pour créer le mot de passe de votre espace client. Vous pourrez y déposer vos photos
     (onglet « Galerie photo ») ; pour le reste, répondez simplement à ce message.</p>
     <p style="margin:0 0 8px 0;">Il vous manque quelque chose ? Pas d'inquiétude : envoyez ce que vous avez, nous complétons ensemble.</p>`),
    { fromName: 'La Gabare', replyTo: AGENCE.email })
  await supabaseAdmin.from('clients').update({ accueil_envoye_at: new Date().toISOString() }).eq('id', client.id)
}
