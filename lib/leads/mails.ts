import 'server-only'
import { sendMail } from '@/lib/mailer'

// Mails des prospects, envoyés directement par le dashboard (remplace le workflow n8n « Nouveau Lead »)

const AGENCE = process.env.AGENCE_NOTIF_EMAIL || process.env.SMTP_USER || ''
const ADMIN_URL = 'https://admin.la-gabare.fr/leads'

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export interface ProspectMail {
  nom?: string | null
  email?: string | null
  domaine?: string | null
  pack_demande?: string | null
  lead_id?: number | null
}

// Mail de prise de contact : réserver un appel ou compléter le formulaire détaillé
export function mailPriseDeContact(p: ProspectMail): string {
  const pack = p.pack_demande ? ` (formule ${esc(p.pack_demande)})` : ''
  const lienBrief = `https://la-gabare.fr/formulaire-complet.html${p.lead_id ? `?lead_id=${p.lead_id}` : ''}`
  // Pré-remplit Cal.com et y attache le lead : le webhook retrouve ainsi le prospect
  const cal = new URLSearchParams()
  if (p.nom) cal.set('name', p.nom)
  if (p.email) cal.set('email', p.email)
  if (p.lead_id) cal.set('metadata[lead_id]', String(p.lead_id))
  const lienCal = `https://cal.com/la-gabare/appel-decouverte-la-gabare${cal.toString() ? `?${cal}` : ''}`
  const sans = "font-family:Arial,'Geist',sans-serif"
  const serif = "font-family:Georgia,'Cormorant Garamond',serif"
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EDE9E2;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#F5F2EC;border:1px solid rgba(26,19,16,0.1);">
<tr><td style="background-color:#1A1310;padding:32px 40px;text-align:center;"><span style="${serif};font-size:24px;letter-spacing:0.04em;color:#F5F2EC;">La Gabare</span></td></tr>
<tr><td style="height:3px;background:linear-gradient(90deg,#5A1226,#B08D57);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:44px 40px 24px 40px;">
  <p style="margin:0 0 6px 0;${sans};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#B08D57;">Votre demande</p>
  <h1 style="margin:0 0 20px 0;${serif};font-weight:400;font-size:28px;line-height:1.25;color:#1A1310;">Merci, ${esc(p.nom || '')}.</h1>
  <p style="margin:0 0 16px 0;${sans};font-size:15px;line-height:1.7;color:#4A3E37;">Nous avons bien reçu votre demande concernant <strong style="color:#1A1310;">${esc(p.domaine || 'votre domaine')}</strong>${pack}.</p>
  <p style="margin:0 0 32px 0;${sans};font-size:15px;line-height:1.7;color:#4A3E37;">Pour avancer, deux options s'offrent à vous : choisissez celle qui vous convient le mieux.</p>
</td></tr>
<tr><td style="padding:0 40px 20px 40px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(26,19,16,0.14);"><tr><td style="padding:24px;">
  <p style="margin:0 0 6px 0;${sans};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#B08D57;">Option 1</p>
  <p style="margin:0 0 14px 0;${serif};font-size:19px;color:#1A1310;">Réserver un appel de 20 minutes</p>
  <p style="margin:0 0 18px 0;${sans};font-size:14px;line-height:1.6;color:#4A3E37;">Le moyen le plus rapide pour qu'on comprenne bien votre projet et qu'on vous propose la formule adaptée.</p>
  <a href="${esc(lienCal)}" style="display:inline-block;padding:12px 28px;background-color:#5A1226;color:#F5F2EC;${sans};font-size:14px;font-weight:600;text-decoration:none;">Réserver un créneau &rarr;</a>
</td></tr></table></td></tr>
<tr><td style="padding:0 40px 36px 40px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(26,19,16,0.14);"><tr><td style="padding:24px;">
  <p style="margin:0 0 6px 0;${sans};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#B08D57;">Option 2</p>
  <p style="margin:0 0 14px 0;${serif};font-size:19px;color:#1A1310;">Compléter le formulaire détaillé</p>
  <p style="margin:0 0 18px 0;${sans};font-size:14px;line-height:1.6;color:#4A3E37;">Vous préférez écrire ? Prenez le temps qu'il vous faut, à votre rythme.</p>
  <a href="${lienBrief}" style="display:inline-block;padding:12px 28px;background-color:transparent;border:1px solid #1A1310;color:#1A1310;${sans};font-size:14px;font-weight:600;text-decoration:none;">Compléter le formulaire &rarr;</a>
</td></tr></table></td></tr>
<tr><td style="padding:0 40px 40px 40px;"><p style="margin:0;${sans};font-size:13px;line-height:1.6;color:#4A3E37;font-style:italic;">Sans nouvelle de votre part sous 5 jours, nous reviendrons vers vous.</p></td></tr>
<tr><td style="background-color:#1A1310;padding:24px 40px;text-align:center;"><p style="margin:0;${sans};font-size:11px;letter-spacing:0.05em;color:rgba(245,242,236,0.5);">La Gabare · Agence pour les domaines viticoles de la Loire</p></td></tr>
</table></td></tr></table>`
}

export async function envoyerPriseDeContact(p: ProspectMail) {
  if (!p.email) throw new Error('Ce lead n\'a pas d\'adresse e-mail')
  await sendMail(p.email, `Votre demande — ${p.domaine || 'La Gabare'}`, mailPriseDeContact(p), { fromName: 'La Gabare', replyTo: AGENCE || undefined })
}

function tableau(titre: string, lignes: [string, unknown][]) {
  const rows = lignes
    .filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== false)
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#7a6f66;vertical-align:top;white-space:nowrap;">${esc(k)}</td><td style="padding:6px 0;">${v === true ? 'Oui' : esc(v)}</td></tr>`)
    .join('')
  return `<h2 style="font-family:Georgia,serif;font-size:20px;margin:0 0 12px;">${esc(titre)}</h2>
<table style="font-family:Arial,sans-serif;font-size:14px;color:#1A1310;border-collapse:collapse;margin-bottom:20px;">${rows}</table>
<p style="font-family:Arial,sans-serif;font-size:14px;"><a href="${ADMIN_URL}" style="color:#5A1226;">Ouvrir les leads dans le dashboard</a></p>`
}

// Notification à l'agence : nouveau lead
export async function notifierAgenceLead(l: Record<string, unknown>, mailEnvoye: boolean) {
  if (!AGENCE) return
  await sendMail(AGENCE, `Nouveau lead — ${l.domaine || l.nom || 'sans nom'}${l.pack_demande ? ` (${l.pack_demande})` : ''}`,
    tableau('Nouveau lead', [
      ['Nom', l.nom], ['E-mail', l.email], ['Téléphone', l.tel], ['Domaine', l.domaine], ['Appellation', l.appellation],
      ['Pack', l.pack_demande], ['Budget', l.budget], ['Échéance', l.echeance], ['Besoins', l.besoins], ['Message', l.message],
      ['Mail de prise de contact', mailEnvoye ? 'envoyé automatiquement' : 'NON ENVOYÉ, à relancer depuis le dashboard'],
    ]), { fromName: 'La Gabare — Leads', replyTo: (l.email as string) || undefined })
}

// Notification à l'agence : appel découverte réservé, reporté ou annulé sur Cal.com
export async function notifierAgenceRdv(l: Record<string, unknown>, debut: string | null, quoi: 'nouveau' | 'reporte' | 'annule') {
  if (!AGENCE) return
  const quand = debut
    ? new Date(debut).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' })
    : null
  const titre = { nouveau: 'RDV pris', reporte: 'RDV reporté', annule: 'RDV annulé' }[quoi]
  await sendMail(AGENCE, `${titre} — ${l.domaine || l.nom || l.email}${quand ? ` · ${quand}` : ''}`,
    tableau(titre, [
      ['Quand', quand], ['Nom', l.nom], ['E-mail', l.email], ['Téléphone', l.tel], ['Domaine', l.domaine],
      ['Pack', l.pack_demande], ['Besoins', l.besoins], ['Message', l.message],
    ]), { fromName: 'La Gabare — Leads', replyTo: (l.email as string) || undefined })
}

// Notification à l'agence : brief détaillé reçu
export async function notifierAgenceBrief(b: Record<string, unknown>, leadTrouve: boolean) {
  if (!AGENCE) return
  await sendMail(AGENCE, `Brief reçu — ${b.nom_domaine || b.nom_contact || 'sans nom'}`,
    tableau('Brief détaillé reçu', [
      ['Domaine', b.nom_domaine], ['Appellation', b.appellation], ['Contact', b.nom_contact], ['Fonction', b.fonction],
      ['E-mail', b.email], ['Téléphone', b.telephone], ['Type de site', b.type_site], ['Budget', b.budget_solution],
      ['Urgence', b.urgence], ['Objectif 12 mois', b.kpi_12mois], ['Positionnement', b.positionnement],
      ['Remarques', b.remarques], ['Disponibilité', b.disponibilite],
      ['Rattaché à un lead', leadTrouve ? `oui (n° ${b.lead_id})` : 'non, aucun lead correspondant'],
    ]), { fromName: 'La Gabare — Leads', replyTo: (b.email as string) || undefined })
}
