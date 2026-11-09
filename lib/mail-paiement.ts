import { gabaritMail, montantMail, STYLE_PETIT } from '@/lib/mail-cadre'

// Modèle « Paiement » de la charte e-mail (lib/mail-cadre.ts)
export function paymentLinkEmail(nomDomaine: string, montant: number, type: 'site' | 'abonnement', paymentUrl: string) {
  const somme = `${montant.toLocaleString('fr-FR')}\u00a0€`
  return gabaritMail({
    label: 'Votre paiement',
    titre: `${nomDomaine}, finalisons votre commande.`,
    corps: `<p style="margin:0 0 8px 0;">Voici le lien de paiement sécurisé pour votre ${type === 'abonnement' ? 'abonnement' : 'projet de site'}.</p>
${montantMail({ label: 'Montant', valeur: type === 'abonnement' ? `${somme}<span style="font-size:18px;font-weight:500;"> / mois</span>` : somme },
  { label: 'Projet', valeur: type === 'abonnement' ? 'Abonnement' : 'Création de site' })}
<p style="${STYLE_PETIT}margin:0 0 16px 0;">Une fois le paiement confirmé, vous recevrez automatiquement l'accès à votre espace personnel.</p>`,
    bouton: { texte: 'Procéder au paiement &rarr;', lien: paymentUrl },
  })
}
