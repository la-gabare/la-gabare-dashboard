import { gabaritMail } from '@/lib/mail-cadre'

// Mails liés à l'abonnement envoyés depuis les webhooks (charte e-mail) : purs, prévisualisables.
// Signature automatique (photo) à la place de « L'équipe La Gabare ».
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const FORT = 'color:#1A1310;font-weight:600;'

export function mailResiliationAnticipee(nomDomaine: string) {
  return gabaritMail({
    label: 'Votre abonnement',
    titre: `${esc(nomDomaine)}, votre abonnement est résilié.`,
    corps: `<p style="margin:0 0 16px 0;">Bonjour,</p>
<p style="margin:0 0 8px 0;">Votre règlement est bien reçu : votre abonnement est résilié à compter d'aujourd'hui et plus aucun prélèvement ne sera effectué.
Votre site reste le vôtre. Merci pour ces mois passés ensemble — si vous souhaitez revenir, il suffit de répondre à ce message.</p>`,
  })
}

// Changement de formule demandé depuis l'espace client (`ancienne` brute, `nouvelle` = libellé de FORMULES)
export function mailChangementFormule(nomDomaine: string, ancienne: string, nouvelle: string, prixMois: string, quand: string) {
  return gabaritMail({
    label: 'Votre abonnement',
    titre: `${esc(nomDomaine)}, votre nouvelle formule ${nouvelle}.`,
    corps: `<p style="margin:0 0 16px 0;">Bonjour,</p><p style="margin:0 0 8px 0;">Votre abonnement passe de la formule ${esc(ancienne)} à la formule <strong style="${FORT}">${nouvelle}</strong>
(${prixMois} par mois), ${quand}.
Votre prochain plan éditorial suivra la nouvelle formule.</p>`,
  })
}

// Demande de résiliation depuis l'espace client (dates déjà formatées)
export function mailDemandeResiliation(nomDomaine: string, formule: string, dateDemande: string, dateEffet: string) {
  return gabaritMail({
    label: 'Votre abonnement',
    titre: `${esc(nomDomaine)}, votre demande de résiliation.`,
    corps: `<p style="margin:0 0 16px 0;">Bonjour,</p><p style="margin:0 0 16px 0;">Nous avons bien reçu votre demande de résiliation de l'abonnement ${esc(formule)}
le ${dateDemande}. Conformément à nos conditions générales, elle prendra effet le <strong style="${FORT}">${dateEffet}</strong> :
l'accompagnement et les prélèvements se poursuivent jusqu'à cette date, puis s'arrêtent automatiquement.</p>
<p style="margin:0 0 8px 0;">Votre site reste le vôtre. Si vous changez d'avis, répondez simplement à ce message.</p>`,
  })
}
