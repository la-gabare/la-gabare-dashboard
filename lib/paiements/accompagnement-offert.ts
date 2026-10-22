import 'server-only'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { clientStripe } from '@/lib/paiements/echeancier'
import { lancerPlanEditorial } from '@/lib/plan-editorial'

// Mois d'accompagnement inclus avec chaque pack (offres de la-gabare.fr)
export const ACCOMPAGNEMENT_INCLUS: Record<string, { formule: string; nom: string; mois: number }> = {
  essentiel: { formule: 'village', nom: 'Village', mois: 3 },
  pro: { formule: 'reserve', nom: 'Réserve', mois: 3 },
  premium: { formule: 'grand_cru', nom: 'Grand Cru', mois: 3 },
}
const PRIX_HT: Record<string, number> = { village: 150, reserve: 350, grand_cru: 550 }
const TVA_PCT = Number(process.env.AGENCE_TVA_TAUX ?? 20)
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const dateFr = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// À la mise en ligne : l'accompagnement offert démarre (plan éditorial tout de suite) et le client enregistre
// son moyen de paiement (carte ou SEPA). Aucun prélèvement avant la fin des mois offerts (période d'essai Stripe).
export async function demarrerAccompagnementOffert(clientId: number) {
  const { data: c } = await supabaseAdmin.from('clients')
    .select('id, nom_domaine, email_contact, stripe_customer_id, pack_site, abonnement, date_debut_abonnement, statut, mois_offerts_bonus')
    .eq('id', clientId).single()
  const inclus = ACCOMPAGNEMENT_INCLUS[String(c?.pack_site || '').toLowerCase()]
  if (!c || !inclus || c.date_debut_abonnement) return null // déjà abonné : rien à offrir de plus

  const moisOfferts = inclus.mois + (c.mois_offerts_bonus || 0) // + mois offert par le parrainage
  const finOffert = new Date()
  finOffert.setMonth(finOffert.getMonth() + moisOfferts)
  // Le client garde sa formule si elle est supérieure à celle incluse ; sinon formule du pack
  const formule = c.abonnement && PRIX_HT[c.abonnement] > PRIX_HT[inclus.formule] ? c.abonnement : inclus.formule
  await supabaseAdmin.from('clients').update({
    abonnement: formule, statut: 'actif', date_debut_abonnement: new Date().toISOString().slice(0, 10),
  }).eq('id', c.id)
  await lancerPlanEditorial(c.id, 'accompagnement-offert')

  const { url, montantCents, nomFormule } = await sessionAbonnement(c, formule, finOffert)
  const session = { url }

  if (c.email_contact && session.url) {
    const prix = (montantCents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
    await sendMail(c.email_contact, `Votre accompagnement ${nomFormule} offert démarre — ${c.nom_domaine}`,
      `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A3E37;max-width:560px;">
       <p>Bonjour,</p>
       <p>Votre site est en ligne et, comme prévu dans votre pack, vos <strong>${moisOfferts} mois d'accompagnement ${esc(inclus.nom)}</strong> commencent aujourd'hui :
       articles, publications et suivi de votre présence en ligne. Votre premier plan éditorial est en préparation.</p>
       <p>Pour que l'accompagnement continue sans interruption après le ${dateFr(finOffert)}, enregistrez dès maintenant votre moyen de paiement
       (carte ou prélèvement SEPA). <strong>Aucun prélèvement avant le ${dateFr(finOffert)}</strong> ; ensuite ${prix} par mois (formule ${esc(nomFormule)}).</p>
       <p><a href="${session.url}" style="display:inline-block;padding:14px 28px;background:#5A1226;color:#F5F2EC;text-decoration:none;font-weight:600;">Enregistrer mon moyen de paiement &rarr;</a></p>
       <p style="font-size:13px;">Ce lien est valable 24 heures ; vous pourrez aussi le faire depuis votre espace client (Paramètres › Abonnement).</p>
       <p>L'équipe La Gabare</p></div>`,
      { fromName: 'La Gabare' })
  }
  return { formule, fin_offert: finOffert.toISOString(), lien: session.url }
}

// Fin des mois offerts d'un client (date de début d'abonnement + mois inclus dans son pack), ou null
export function finMoisOfferts(c: { pack_site?: string | null; date_debut_abonnement?: string | null; mois_offerts_bonus?: number | null }) {
  const inclus = ACCOMPAGNEMENT_INCLUS[String(c.pack_site || '').toLowerCase()]
  if (!inclus || !c.date_debut_abonnement) return null
  const fin = new Date(c.date_debut_abonnement)
  fin.setMonth(fin.getMonth() + inclus.mois + (c.mois_offerts_bonus || 0))
  return fin
}

// Page Stripe d'abonnement (carte ou SEPA) ; sans prélèvement avant `debutFacturation` si la date est future
export async function sessionAbonnement(
  c: { id: number; nom_domaine: string; email_contact: string | null; stripe_customer_id: string | null },
  formule: string,
  debutFacturation: Date | null,
) {
  const customer = await clientStripe(c)
  const montantCents = Math.round(PRIX_HT[formule] * (1 + TVA_PCT / 100) * 100)
  const nomFormule = { village: 'Village', reserve: 'Réserve', grand_cru: 'Grand Cru' }[formule] || formule
  const essai = debutFacturation && debutFacturation.getTime() > Date.now() + 48 * 60 * 60 * 1000
  const params = {
    mode: 'subscription' as const,
    customer,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'eur', unit_amount: montantCents, recurring: { interval: 'month' as const },
        product_data: { name: `La Gabare — ${nomFormule} — ${c.nom_domaine}` },
      },
    }],
    subscription_data: {
      ...(essai ? { trial_end: Math.floor(debutFacturation!.getTime() / 1000) } : {}),
      metadata: { client_id: String(c.id), formule },
    },
    payment_method_collection: 'always' as const,
    metadata: { client_id: String(c.id) },
    success_url: 'https://la-gabare.fr/merci-paiement.html',
    cancel_url: 'https://la-gabare.fr/espace-client.html',
  }
  let session
  try {
    session = await stripe.checkout.sessions.create({ ...params, payment_method_types: ['card', 'sepa_debit'] })
  } catch {
    session = await stripe.checkout.sessions.create({ ...params, payment_method_types: ['card'] })
  }
  return { url: session.url, montantCents, nomFormule }
}
