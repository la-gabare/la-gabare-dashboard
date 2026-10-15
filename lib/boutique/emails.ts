import 'server-only'
import { esc, euros, LigneCommande } from '@/lib/boutique/core'

interface CommandeMail {
  numero: number | null
  nom: string | null
  email: string | null
  telephone: string | null
  lignes: LigneCommande[]
  sous_total_cents: number
  frais_port_cents: number
  total_cents: number
  livraison: { mode?: string; adresse?: Record<string, string | null> } | null
  numero_suivi?: string | null
  transporteur?: string | null
}

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

function tableau(c: CommandeMail) {
  const rows = c.lignes.map(l => `
    <tr>
      <td style="padding:6px 0;">${l.quantite} × ${esc(l.nom)}${l.millesime ? ' ' + esc(l.millesime) : ''}</td>
      <td style="padding:6px 0;text-align:right;white-space:nowrap;">${euros(l.prix_cents * l.quantite)}</td>
    </tr>`).join('')
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-top:1px solid rgba(26,19,16,.15);margin:16px 0;">
    ${rows}
    <tr><td style="padding:6px 0;color:#7a6f66;">${c.livraison?.mode === 'retrait' ? 'Retrait au caveau' : 'Livraison'}</td><td style="text-align:right;color:#7a6f66;">${euros(c.frais_port_cents)}</td></tr>
    <tr><td style="padding:8px 0;border-top:1px solid rgba(26,19,16,.15);font-weight:bold;">Total TTC</td><td style="text-align:right;border-top:1px solid rgba(26,19,16,.15);font-weight:bold;">${euros(c.total_cents)}</td></tr>
  </table>`
}

function adresse(c: CommandeMail) {
  if (c.livraison?.mode === 'retrait') return '<p><b>Retrait au caveau</b> — le domaine vous prévient quand votre commande est prête.</p>'
  const a = c.livraison?.adresse || {}
  const lignes = [c.nom, a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(' ')].filter(Boolean).map(esc)
  return `<p><b>Livraison :</b><br>${lignes.join('<br>')}</p>`
}

export function mailConfirmationAcheteur(domaine: string, c: CommandeMail) {
  return cadre(esc(domaine), `
    <p>Bonjour${c.nom ? ' ' + esc(c.nom.split(' ')[0]) : ''},</p>
    <p>Merci pour votre commande n° <b>${c.numero}</b>. Elle est bien enregistrée et payée.</p>
    ${tableau(c)}
    ${adresse(c)}
    <p>Vous recevrez un e-mail dès son expédition. Pour toute question, répondez simplement à ce message.</p>
    <p>À bientôt,<br>${esc(domaine)}</p>`)
}

export function mailNouvelleCommandeDomaine(domaine: string, c: CommandeMail) {
  return cadre(`Nouvelle commande n° ${c.numero}`, `
    <p><b>${esc(c.nom || 'Client')}</b> — ${esc(c.email || '')}${c.telephone ? ' — ' + esc(c.telephone) : ''}</p>
    ${tableau(c)}
    ${adresse(c)}
    <p><a href="https://la-gabare.fr/espace-client.html" style="color:#8a6d3b;">Ouvrir mon espace › Ma boutique</a> pour la préparer et l'expédier.</p>`)
}

export function mailExpedition(domaine: string, c: CommandeMail) {
  const suivi = c.numero_suivi
    ? `<p>Transporteur : <b>${esc(c.transporteur || '—')}</b><br>Numéro de suivi : <b>${esc(c.numero_suivi)}</b></p>`
    : ''
  const intro = c.livraison?.mode === 'retrait'
    ? `<p>Votre commande n° <b>${c.numero}</b> est prête : vous pouvez venir la retirer au caveau.</p>`
    : `<p>Votre commande n° <b>${c.numero}</b> vient d'être expédiée.</p>`
  return cadre(esc(domaine), `
    <p>Bonjour${c.nom ? ' ' + esc(c.nom.split(' ')[0]) : ''},</p>
    ${intro}
    ${suivi}
    ${tableau(c)}
    <p>Merci de votre confiance,<br>${esc(domaine)}</p>`)
}
