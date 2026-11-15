// Mail « Présentation de La Gabare » : premier contact à un domaine viticole de la Loire, sans offre ni prix.
// Campagne de prospection (pas une newsletter) : rien ne part sans aperçu puis validation explicite.
import { gabaritMail, boutonMail, p } from '@/lib/mail-cadre'
import { esc, messageEnHtml } from '@/lib/mail-maquette'

export const LIEN_SITE = 'https://la-gabare.fr'
export const LIEN_AUDIT = 'https://la-gabare.fr/audit-gratuit.html'

export const objetPresentation = 'La Gabare, une agence web pour les domaines de la Loire'

// Message type : la phrase entre crochets est à personnaliser avant l'envoi. La signature d'Alexandre s'ajoute toute seule.
export function messagePresentation(nom?: string | null): string {
  return `Bonjour,

Je suis Alexandre, de La Gabare. Nous sommes une petite agence web qui travaille uniquement avec des domaines viticoles de la Loire : sites, boutique en ligne, et accompagnement pour faire vivre votre présence en ligne.

${nom ? `[Une phrase personnelle sur ${nom}.]` : '[Une phrase personnelle sur le domaine.]'}

Si vous voulez voir comment nous travaillons, tout est sur notre site. Et si vous êtes curieux de savoir ce que l'on voit de votre domaine sur Google, nous proposons un audit gratuit de votre site : en quelques minutes, vous recevez un rapport par mail, sans engagement.

Je reste à votre disposition si vous souhaitez en discuter.

Belle journée à vous,`
}

export function htmlMailPresentation(message: string): string {
  return gabaritMail({
    label: 'Présentation',
    titre: 'La Gabare, l’agence des domaines de la Loire',
    corps: messageEnHtml(message),
    bouton: { texte: 'Découvrir le site', lien: LIEN_SITE },
    apresBouton: `${boutonMail('Recevoir mon audit gratuit', esc(LIEN_AUDIT), { secondaire: true, marge: '12px 0 0 0' })}
${p(`<span style="font-size:11px;">Pour ne plus recevoir de message de La Gabare, répondez simplement « stop ».</span>`, '24px 0 0 0')}`,
  })
}
