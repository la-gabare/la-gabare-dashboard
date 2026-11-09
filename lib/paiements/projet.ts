import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { notifier, enTexte } from '@/lib/notifier'
import { envoyerEcheance, type Echeance } from '@/lib/paiements/echeancier'
import { gabaritMail } from '@/lib/mail-cadre'

const AGENCE = process.env.AGENCE_NOTIF_EMAIL || process.env.SMTP_USER || ''
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

// Envoie le versement « à venir » correspondant à une étape du projet (maquette validée, mise en ligne).
// En 3 fois : maquette → versement 2, mise en ligne → versement 3. En 2 fois : mise en ligne → versement 2.
export async function declencherVersement(clientId: number, etape: 'maquette' | 'mise_en_ligne') {
  const { data } = await supabaseAdmin.from('echeances').select('*')
    .eq('client_id', clientId).neq('statut', 'annule').order('ordre')
  const echeances = (data || []) as Echeance[]
  if (echeances.length < 2) return null
  const cible = etape === 'mise_en_ligne'
    ? echeances[echeances.length - 1]
    : echeances.length === 3 ? echeances[1] : null
  if (!cible || cible.statut !== 'a_venir') return null
  // Statut d'abord : le lien de paiement fonctionne même si le mail échoue (l'agence est prévenue)
  await supabaseAdmin.from('echeances').update({ statut: 'envoye', envoye_at: new Date().toISOString() }).eq('id', cible.id)
  try {
    await envoyerEcheance(cible)
  } catch (err) {
    console.error('versement: mail non envoyé', cible.id, err)
    await notifier({ titre: `Versement non envoyé au client — ${cible.libelle}`, corps: "Le mail n'est pas parti : renvoyez-le depuis la fiche client (échéancier).", niveau: 'warning', url: `https://admin.la-gabare.fr/clients/${clientId}` })
  }
  return cible
}

// Mails « Votre site » : gabarit unique de la charte
function mail(titre: string, corps: string, bouton?: { texte: string; lien: string }) {
  return gabaritMail({ label: 'Votre site', titre, corps, bouton: bouton ? { texte: `${bouton.texte} &rarr;`, lien: bouton.lien } : undefined })
}

const LIEN = 'color:#5A1226;font-weight:500;'

// HTML purs, prévisualisables
export function htmlMaquettePrete(nomDomaine: string, url: string) {
  return mail(
    `${esc(nomDomaine)}, votre maquette est prête.`,
    `<p style="margin:0 0 16px 0;">Vous pouvez la découvrir ici : <a href="${esc(url)}" style="${LIEN}">${esc(url)}</a></p>
     <p style="margin:0 0 24px 0;">Prenez le temps de la parcourir. Ensuite, depuis votre espace client, validez-la ou indiquez-nous les corrections
     souhaitées : nous les intégrons avant la mise en ligne.</p>`,
    { texte: 'Valider ou commenter la maquette', lien: 'https://la-gabare.fr/espace-client.html' })
}

export function htmlSiteEnLigne(nomDomaine: string, url: string) {
  return mail(
    `${esc(nomDomaine)}, votre site est en ligne !`,
    `<p style="margin:0 0 24px 0;">Il est désormais accessible à l'adresse <a href="${esc(url)}" style="${LIEN}">${esc(url)}</a>.
     Merci pour votre confiance. Votre espace client reste votre point d'entrée pour suivre vos articles, vos publications et vos factures.</p>`,
    { texte: 'Découvrir mon site', lien: url })
}

export async function mailMaquetteSoumise(client: { nom_domaine: string; email_contact: string | null }, url: string) {
  if (!client.email_contact) throw new Error('Ce client n\'a pas d\'adresse e-mail')
  await sendMail(client.email_contact, `Votre maquette est prête — ${client.nom_domaine}`, htmlMaquettePrete(client.nom_domaine, url),
    { fromName: 'La Gabare', replyTo: AGENCE || undefined })
}

export async function mailMiseEnLigne(client: { nom_domaine: string; email_contact: string | null }, url: string) {
  if (!client.email_contact) return
  await sendMail(client.email_contact, `Votre site est en ligne — ${client.nom_domaine}`, htmlSiteEnLigne(client.nom_domaine, url),
    { fromName: 'La Gabare', replyTo: AGENCE || undefined })
}

export async function notifierAgence(sujet: string, html: string) {
  await notifier({ titre: sujet, corps: enTexte(html), niveau: 'info' })
  if (!AGENCE) return
  try {
    await sendMail(AGENCE, sujet, `<div style="font-family:Arial,sans-serif;font-size:14px;">${html}</div>`, { fromName: 'La Gabare — Projets' })
  } catch (e) {
    console.error('notif projet', e)
  }
}
