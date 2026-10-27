import type Stripe from 'stripe'

// CGV : 12 mois d'engagement initial, puis mois par mois ; résiliation avec préavis de deux mois
export const ENGAGEMENT_MOIS = 12
export const PREAVIS_MOIS = 2
// Sortie anticipée (CGV) : 50 % des mensualités restant dues jusqu'à la date de fin normale
export const INDEMNITE_PCT = 50

export const plusMois = (d: Date, n: number) => { const r = new Date(d); r.setMonth(r.getMonth() + n); return r }

export function dates(client: Record<string, any>, sub: Stripe.Subscription | null, maintenant = new Date()) {
  // Les 12 mois comptent « mois offerts compris » : départ = début de l'accompagnement (mise en ligne), pas l'enregistrement de la carte
  const debut = client.date_debut_abonnement ? new Date(client.date_debut_abonnement) : sub ? new Date(sub.start_date * 1000) : null
  const finEngagement = debut ? plusMois(debut, ENGAGEMENT_MOIS) : null
  const auPlusTot = plusMois(maintenant, PREAVIS_MOIS)
  const effet = finEngagement && finEngagement > auPlusTot ? finEngagement : auPlusTot
  return { debut, finEngagement, effet }
}

export function sortieAnticipee(sub: Stripe.Subscription | null, effet: Date) {
  const item = sub?.items.data[0]
  if (!sub || !item?.price?.unit_amount) return null
  // Mensualités restantes : prélèvements à venir entre la fin de la période en cours et la date de fin normale
  let restants = 0
  for (let d = new Date(item.current_period_end * 1000); d < effet; d = plusMois(d, 1)) restants++
  if (!restants) return null
  return { mois_restants: restants, indemnite_cents: Math.round((restants * item.price.unit_amount * INDEMNITE_PCT) / 100) }
}
