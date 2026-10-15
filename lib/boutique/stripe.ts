import 'server-only'
import Stripe from 'stripe'

// Clé Stripe propre à la boutique des domaines (Stripe Connect), séparée de celle des abonnements La Gabare :
// permet de tester la boutique en mode test pendant que les abonnements restent en mode réel.
// Sans STRIPE_BOUTIQUE_SECRET_KEY, on retombe sur la clé principale.
const secretKey = process.env.STRIPE_BOUTIQUE_SECRET_KEY || process.env.STRIPE_SECRET_KEY

if (!secretKey) {
  throw new Error('Missing STRIPE_BOUTIQUE_SECRET_KEY / STRIPE_SECRET_KEY environment variable')
}

export const stripeBoutique = new Stripe(secretKey)

// Messages Stripe techniques (en anglais) -> message lisible pour le vigneron
export function messageStripe(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/signed up for Connect|platform/i.test(msg)) return 'Les paiements en ligne ne sont pas encore ouverts par La Gabare. Contactez-nous.'
  if (/No such account/i.test(msg)) return 'Votre compte Stripe est introuvable. Contactez La Gabare.'
  return 'Stripe est momentanément indisponible. Réessayez dans quelques minutes.'
}
