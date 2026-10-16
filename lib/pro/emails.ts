import 'server-only'
import { esc, euros } from '@/lib/boutique/core'
import { DUREE_ACCES_JOURS } from '@/lib/pro/core'

function cadre(titre: string, corps: string) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDE9E2;padding:32px 12px;font-family:Georgia,serif;color:#1A1310;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#F5F2EC;border:1px solid rgba(26,19,16,.1);">
      <tr><td style="background:#1A1310;color:#F5F2EC;padding:24px 32px;font-size:20px;">${titre}</td></tr>
      <tr><td style="padding:28px 32px;font-size:15px;line-height:1.6;">${corps}</td></tr>
      <tr><td style="padding:16px 32px;font-size:11px;color:#7a6f66;border-top:1px solid rgba(26,19,16,.1);">L'abus d'alcool est dangereux pour la santé, à consommer avec modération.</td></tr>
    </table>
  </td></tr>
</table>`
}

function bouton(lien: string, texte: string) {
  return `<p style="margin:24px 0;"><a href="${esc(lien)}" style="display:inline-block;padding:12px 26px;background:#5A1226;color:#F5F2EC;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;">${esc(texte)}</a></p>`
}

export function mailDemandeAccesDomaine(domaine: string, p: Record<string, unknown>) {
  return cadre('Nouvelle demande d\'accès professionnel', `
    <p><b>${esc(p.entreprise)}</b>${p.activite ? ' — ' + esc(p.activite) : ''}${p.ville ? ', ' + esc(p.ville) : ''}</p>
    <p>${esc(p.nom || '')} · ${esc(p.email)}${p.telephone ? ' · ' + esc(p.telephone) : ''}${p.siret ? '<br>SIRET : ' + esc(p.siret) : ''}</p>
    ${p.message ? `<p style="border-left:3px solid #B08D57;padding-left:12px;color:#4A3E37;">${esc(p.message)}</p>` : ''}
    <p>Validez ou refusez cette demande dans votre espace : <b>Ma boutique › Professionnels</b>.</p>
    ${bouton('https://la-gabare.fr/espace-client.html?boutique=pros', 'Ouvrir mon espace')}`)
}

export function mailAccuseDemandePro(domaine: string, entreprise: string) {
  return cadre(esc(domaine), `
    <p>Bonjour,</p>
    <p>Nous avons bien reçu la demande d'accès professionnel de <b>${esc(entreprise)}</b>. Le domaine la vérifie et vous recevrez votre lien d'accès personnel par e-mail dès sa validation.</p>
    <p>À bientôt,<br>${esc(domaine)}</p>`)
}

export function mailAccesPro(domaine: string, nom: string | null, lien: string, nouveau: boolean) {
  return cadre(esc(domaine), `
    <p>Bonjour${nom ? ' ' + esc(nom.split(' ')[0]) : ''},</p>
    <p>${nouveau ? 'Votre accès professionnel est ouvert.' : 'Voici votre nouveau lien d\'accès professionnel.'} Il vous donne accès à nos tarifs professionnels, aux fiches techniques de nos cuvées et vous permet d'envoyer une demande de commande ou d'échantillons.</p>
    ${bouton(lien, 'Accéder à l\'espace professionnel')}
    <p style="font-size:13px;color:#7a6f66;">Ce lien est personnel et valable ${DUREE_ACCES_JOURS} jours. Ne le transférez pas. Vous pourrez en demander un nouveau à tout moment depuis la page professionnels du site.</p>
    <p>${esc(domaine)}</p>`)
}

export function mailDemandePro(domaine: string, pro: Record<string, unknown>, d: { type: string; lignes: any[]; total_ht_cents: number; message?: string | null }) {
  const lignes = d.lignes.map((l) => `<tr><td style="padding:5px 0;">${l.quantite} × ${esc(l.nom)}${l.millesime ? ' ' + esc(l.millesime) : ''}</td><td style="text-align:right;">${l.prix_pro_cents != null ? euros(l.prix_pro_cents * l.quantite) + ' HT' : ''}</td></tr>`).join('')
  return cadre(d.type === 'commande' ? 'Demande de commande professionnelle' : 'Demande d\'échantillons', `
    <p><b>${esc(pro.entreprise)}</b> — ${esc(pro.nom || '')} · ${esc(pro.email)}</p>
    <table role="presentation" width="100%" style="font-size:14px;border-top:1px solid rgba(26,19,16,.15);margin:12px 0;">${lignes}
      ${d.type === 'commande' ? `<tr><td style="padding:8px 0;border-top:1px solid rgba(26,19,16,.15);font-weight:bold;">Total HT indicatif</td><td style="text-align:right;border-top:1px solid rgba(26,19,16,.15);font-weight:bold;">${euros(d.total_ht_cents)}</td></tr>` : ''}
    </table>
    ${d.message ? `<p style="border-left:3px solid #B08D57;padding-left:12px;color:#4A3E37;">${esc(d.message)}</p>` : ''}
    <p>Répondez directement à cet e-mail pour confirmer, envoyer votre facture ou organiser l'envoi.</p>
    ${bouton('https://la-gabare.fr/espace-client.html?boutique=pros', 'Voir dans mon espace')}`)
}
