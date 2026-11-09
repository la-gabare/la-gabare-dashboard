import { lienBrief as lienBriefSigne } from '@/lib/anti-spam'
import 'server-only'
import { sendMail } from '@/lib/mailer'
import { notifier } from '@/lib/notifier'
import { gabaritMail, carteMail, labelMail, titreCarte, boutonMail, STYLE_PETIT } from '@/lib/mail-cadre'

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
  const lienBrief = lienBriefSigne(p.lead_id)
  // Pré-remplit Cal.com et y attache le lead : le webhook retrouve ainsi le prospect
  const cal = new URLSearchParams()
  if (p.nom) cal.set('name', p.nom)
  if (p.email) cal.set('email', p.email)
  if (p.lead_id) cal.set('metadata[lead_id]', String(p.lead_id))
  const lienCal = `https://cal.com/la-gabare/appel-decouverte-la-gabare${cal.toString() ? `?${cal}` : ''}`
  const option = (n: string, titre: string, texte: string, bouton: string) => carteMail(
    `${labelMail(n, '0 0 6px 0')}${titreCarte(titre)}<p style="margin:0 0 4px 0;">${texte}</p>${bouton}`, { padding: '24px' })
  return gabaritMail({
    label: 'Votre demande',
    titre: `Merci, ${esc(p.nom || '')}.`,
    corps: `<p style="margin:0 0 16px 0;">Nous avons bien reçu votre demande concernant <strong style="color:#1A1310;font-weight:600;">${esc(p.domaine || 'votre domaine')}</strong>${pack}.</p>
<p style="margin:0 0 24px 0;">Pour avancer, deux options s'offrent à vous : choisissez celle qui vous convient le mieux.</p>
${option('Option 1', 'Réserver un appel de 20 minutes', 'Le moyen le plus rapide pour qu\'on comprenne bien votre projet et qu\'on vous propose la formule adaptée.', boutonMail('Réserver un créneau &rarr;', esc(lienCal), { marge: '14px 0 0 0' }))}
${option('Option 2', 'Compléter le formulaire détaillé', 'Vous préférez écrire ? Prenez le temps qu\'il vous faut, à votre rythme.', boutonMail('Compléter le formulaire &rarr;', lienBrief, { secondaire: true, marge: '14px 0 0 0' }))}
<p style="${STYLE_PETIT}margin:8px 0 0 0;font-style:italic;">Sans nouvelle de votre part sous 5 jours, nous reviendrons vers vous.</p>`,
  })
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
  await notifier({
    titre: `Nouveau lead — ${l.domaine || l.nom || 'sans nom'}${l.pack_demande ? ` (${l.pack_demande})` : ''}`,
    corps: [l.email, l.tel, l.besoins].filter(Boolean).join(' · '), niveau: mailEnvoye ? 'info' : 'warning',
    url: `${ADMIN_URL}`, id: `lead-${l.id}`,
  })
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
  const quand = debut
    ? new Date(debut).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' })
    : null
  const titre = { nouveau: 'RDV pris', reporte: 'RDV reporté', annule: 'RDV annulé' }[quoi]
  await notifier({
    titre: `${titre} — ${l.domaine || l.nom || l.email}`, corps: quand || undefined,
    niveau: quoi === 'annule' ? 'warning' : 'success', url: ADMIN_URL, id: `rdv-${l.id}-${quoi}-${debut || ''}`,
  })
  if (!AGENCE) return
  await sendMail(AGENCE, `${titre} — ${l.domaine || l.nom || l.email}${quand ? ` · ${quand}` : ''}`,
    tableau(titre, [
      ['Quand', quand], ['Nom', l.nom], ['E-mail', l.email], ['Téléphone', l.tel], ['Domaine', l.domaine],
      ['Pack', l.pack_demande], ['Besoins', l.besoins], ['Message', l.message],
    ]), { fromName: 'La Gabare — Leads', replyTo: (l.email as string) || undefined })
}

// Notification à l'agence : brief détaillé reçu
export async function notifierAgenceBrief(b: Record<string, unknown>, leadTrouve: boolean) {
  await notifier({
    titre: `Brief reçu — ${b.nom_domaine || b.nom_contact || 'sans nom'}`,
    corps: [b.nom_contact, b.email, b.type_site].filter(Boolean).join(' · '), niveau: 'success',
    url: ADMIN_URL, id: `brief-${b.id}`,
  })
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
