import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { notifier, enTexte } from '@/lib/notifier'
import { envoyerEcheance, Echeance } from '@/lib/paiements/echeancier'

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
  await envoyerEcheance(cible)
  await supabaseAdmin.from('echeances').update({ statut: 'envoye', envoye_at: new Date().toISOString() }).eq('id', cible.id)
  return cible
}

function mail(titre: string, corps: string, bouton?: { texte: string; lien: string }) {
  const sans = 'font-family:Arial,sans-serif'
  const serif = "font-family:Georgia,'Cormorant Garamond',serif"
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EDE9E2;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#F5F2EC;border:1px solid rgba(26,19,16,0.1);">
<tr><td style="background-color:#1A1310;padding:32px 40px;text-align:center;"><span style="${serif};font-size:24px;letter-spacing:0.04em;color:#F5F2EC;">La Gabare</span></td></tr>
<tr><td style="height:3px;background:linear-gradient(90deg,#5A1226,#B08D57);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:44px 40px 36px 40px;${sans};font-size:15px;line-height:1.7;color:#4A3E37;">
  <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#B08D57;">Votre site</p>
  <h1 style="margin:0 0 20px 0;${serif};font-weight:400;font-size:26px;color:#1A1310;">${titre}</h1>
  ${corps}
  ${bouton ? `<a href="${bouton.lien}" style="display:inline-block;margin-top:8px;padding:14px 32px;background-color:#5A1226;color:#F5F2EC;font-size:15px;font-weight:600;text-decoration:none;">${bouton.texte} &rarr;</a>` : ''}
</td></tr>
<tr><td style="background-color:#1A1310;padding:24px 40px;text-align:center;"><p style="margin:0;${sans};font-size:11px;color:rgba(245,242,236,0.5);">La Gabare — Agence pour les domaines viticoles de la Loire</p></td></tr>
</table></td></tr></table>`
}

export async function mailMaquetteSoumise(client: { nom_domaine: string; email_contact: string | null }, url: string) {
  if (!client.email_contact) throw new Error('Ce client n\'a pas d\'adresse e-mail')
  await sendMail(client.email_contact, `Votre maquette est prête — ${client.nom_domaine}`, mail(
    `${esc(client.nom_domaine)}, votre maquette est prête.`,
    `<p style="margin:0 0 16px 0;">Vous pouvez la découvrir ici : <a href="${esc(url)}" style="color:#5A1226;">${esc(url)}</a></p>
     <p style="margin:0 0 24px 0;">Prenez le temps de la parcourir. Ensuite, depuis votre espace client, validez-la ou indiquez-nous les corrections
     souhaitées : nous les intégrons avant la mise en ligne.</p>`,
    { texte: 'Valider ou commenter la maquette', lien: 'https://la-gabare.fr/espace-client.html' }), { fromName: 'La Gabare', replyTo: AGENCE || undefined })
}

export async function mailMiseEnLigne(client: { nom_domaine: string; email_contact: string | null }, url: string) {
  if (!client.email_contact) return
  await sendMail(client.email_contact, `Votre site est en ligne — ${client.nom_domaine}`, mail(
    `${esc(client.nom_domaine)}, votre site est en ligne !`,
    `<p style="margin:0 0 24px 0;">Il est désormais accessible à l'adresse <a href="${esc(url)}" style="color:#5A1226;">${esc(url)}</a>.
     Merci pour votre confiance. Votre espace client reste votre point d'entrée pour suivre vos articles, vos publications et vos factures.</p>`,
    { texte: 'Découvrir mon site', lien: url }), { fromName: 'La Gabare', replyTo: AGENCE || undefined })
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
