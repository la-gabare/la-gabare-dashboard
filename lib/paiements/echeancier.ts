import 'server-only'
import crypto from 'crypto'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { gabaritMail } from '@/lib/mail-cadre'

export const ADMIN_URL = 'https://admin.la-gabare.fr'

export const PRIX_PACKS: Record<string, number> = { essentiel: 1990, pro: 4490, premium: 6990 }

// Formules de paiement du site (CGV : 40 / 30 / 30 sauf stipulation contraire au devis)
export const FORMULES: Record<string, { nom: string; parts: [string, number][] }> = {
  '1x': { nom: 'En une fois', parts: [['Paiement du site', 100]] },
  '2x': { nom: 'En deux fois (50 / 50)', parts: [['Acompte à la commande', 50], ['Mise en ligne', 50]] },
  '3x': {
    nom: 'En trois fois (40 / 30 / 30)',
    parts: [['Acompte à la commande', 40], ['Validation de la maquette', 30], ['Mise en ligne', 30]],
  },
}

export interface Echeance {
  id: number
  client_id: number
  ordre: number
  libelle: string
  montant_cents: number
  statut: 'a_venir' | 'envoye' | 'virement_en_attente' | 'paye' | 'annule'
  token: string
  envoye_at: string | null
  relances: number
  derniere_relance_at: string | null
  paye_at: string | null
  moyen: string | null
}

export function lienPaiement(e: Pick<Echeance, 'token'>) {
  return `${ADMIN_URL}/api/public/payer/${e.token}`
}

// Découpe le total en versements ; le dernier absorbe les arrondis
export function decouper(totalCents: number, formule: string) {
  const f = FORMULES[formule]
  if (!f) throw new Error('Formule inconnue')
  let reste = totalCents
  return f.parts.map(([libelle, pct], i) => {
    const montant = i === f.parts.length - 1 ? reste : Math.round((totalCents * pct) / 100)
    reste -= montant
    return { ordre: i + 1, libelle, montant_cents: montant, token: crypto.randomBytes(24).toString('base64url') }
  })
}

export const euros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: cents % 100 ? 2 : 0 })

export async function clientStripe(client: { id: number; nom_domaine: string; email_contact: string | null; stripe_customer_id: string | null }) {
  if (client.stripe_customer_id) return client.stripe_customer_id
  const c = await stripe.customers.create({
    email: client.email_contact || undefined,
    name: client.nom_domaine,
    metadata: { client_id: String(client.id) },
  })
  await supabaseAdmin.from('clients').update({ stripe_customer_id: c.id }).eq('id', client.id)
  return c.id
}

// Session de paiement Stripe pour un versement : carte ou virement bancaire (IBAN dédié, rapprochement automatique).
// Si le virement n'est pas encore activé sur le compte Stripe, on retombe sur la carte seule.
export async function ouvrirPaiement(e: Echeance) {
  const { data: client } = await supabaseAdmin.from('clients')
    .select('id, nom_domaine, email_contact, stripe_customer_id').eq('id', e.client_id).single()
  if (!client) throw new Error('Client introuvable')
  const customer = await clientStripe(client)

  const base: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    customer,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'eur',
        unit_amount: e.montant_cents,
        product_data: { name: `Site ${client.nom_domaine} — ${e.libelle}` },
      },
    }],
    invoice_creation: { enabled: true, invoice_data: { description: `${e.libelle} — site ${client.nom_domaine}` } },
    metadata: { client_id: String(client.id), echeance_id: String(e.id) },
    payment_intent_data: { metadata: { client_id: String(client.id), echeance_id: String(e.id) } },
    success_url: 'https://la-gabare.fr/merci-paiement.html',
    cancel_url: 'https://la-gabare.fr/',
  }

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create({
      ...base,
      payment_method_types: ['card', 'customer_balance'],
      payment_method_options: {
        customer_balance: { funding_type: 'bank_transfer', bank_transfer: { type: 'eu_bank_transfer', eu_bank_transfer: { country: 'FR' } } },
      },
    })
  } catch (err) {
    console.error('Virement Stripe indisponible, paiement par carte seule :', err instanceof Error ? err.message : err)
    session = await stripe.checkout.sessions.create({ ...base, payment_method_types: ['card'] })
  }
  await supabaseAdmin.from('echeances').update({ checkout_session_id: session.id }).eq('id', e.id)
  return session.url!
}

// Mails de versement : gabarit unique de la charte (modèle Paiement)
function gabarit(surtitre: string, titre: string, corps: string, bouton: string, lien: string) {
  return gabaritMail({ label: surtitre, titre, corps, bouton: { texte: `${bouton} &rarr;`, lien },
    apresBouton: `<p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;">Vous pouvez régler par carte bancaire ou par virement : la page de paiement vous indique l'IBAN à utiliser.</p>` })
}

const para = (t: string) => `<p style="margin:0 0 24px 0;">${t}</p>`
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

// HTML du mail de versement (ou de son rappel) : pur, prévisualisable
export function mailEcheance(nomDomaine: string, e: Pick<Echeance, 'libelle' | 'montant_cents' | 'ordre' | 'token'>, relance = false) {
  const nom = esc(nomDomaine)
  const montant = `<strong style="color:#1A1310;font-weight:600;">${euros(e.montant_cents)}</strong>`
  return relance
    ? gabarit('Rappel', `${nom}, petit rappel.`,
        para(`Sauf erreur de notre part, le versement « ${esc(e.libelle)} » de ${montant} pour votre site n'a pas encore été reçu.
          Si vous l'avez déjà réglé, merci de ne pas tenir compte de ce message.`),
        'Régler le versement', lienPaiement(e))
    : gabarit('Votre paiement', `${nom}, ${e.ordre === 1 ? 'lançons votre projet.' : 'votre site avance.'}`,
        para(`Voici le lien de paiement sécurisé pour le versement « ${esc(e.libelle)} » de ${montant}.
          ${e.ordre === 1 ? 'Dès réception, nous lançons la création de votre site et vous recevez l\'accès à votre espace personnel.' : ''}`),
        'Procéder au paiement', lienPaiement(e))
}

export async function envoyerEcheance(e: Echeance, relance = false) {
  const { data: client } = await supabaseAdmin.from('clients').select('nom_domaine, email_contact').eq('id', e.client_id).single()
  if (!client?.email_contact) throw new Error('Ce client n\'a pas d\'adresse e-mail')
  const html = mailEcheance(client.nom_domaine, e, relance)
  await sendMail(client.email_contact,
    `${relance ? 'Rappel — ' : ''}${e.libelle} — ${client.nom_domaine}`, html, { fromName: 'La Gabare' })
}

// Versement réglé : marque payé, active le client au premier paiement et envoie l'accès à son espace.
// Rejouable : si l'activation échoue après le passage en « payé », le webhook répond 500, Stripe le rejoue
// et on reprend ici l'activation (sans refaire ce qui avait réussi).
export async function marquerPayee(echeanceId: number, moyen: string) {
  let { data: e } = await supabaseAdmin.from('echeances')
    .update({ statut: 'paye', paye_at: new Date().toISOString(), moyen })
    .eq('id', echeanceId).neq('statut', 'paye').select().single()
  const rejeu = !e
  if (!e) {
    const { data: dejaPaye } = await supabaseAdmin.from('echeances').select('*').eq('id', echeanceId).eq('statut', 'paye').single()
    if (!dejaPaye) return null
    e = dejaPaye
  }
  const vientDEtreActive = await activerClient(e.client_id) // lève une erreur si l'invitation échoue
  if (rejeu && !vientDEtreActive) return null // webhook reçu deux fois, tout était déjà fait
  if (e.ordre === 1) {
    // Mail d'accueil : contenus à fournir (import tardif pour éviter la dépendance circulaire avec devis.ts)
    try {
      const { envoyerAccueil } = await import('@/lib/paiements/devis')
      await envoyerAccueil(e.client_id)
    } catch (err) {
      console.error("mail d'accueil", err)
    }
    try {
      const { recompenserParrain } = await import('@/lib/parrainage')
      await recompenserParrain(e.client_id)
    } catch (err) {
      console.error('récompense parrainage', err)
    }
  }
  return e as Echeance
}

// Renvoie true si le client vient de passer « actif ». Le statut est écrit en dernier :
// tant que l'invitation n'est pas partie, un rejeu du webhook recommence l'activation.
export async function activerClient(clientId: number | string): Promise<boolean> {
  const { data: client } = await supabaseAdmin.from('clients')
    .select('id, statut, email_contact').eq('id', clientId).single()
  if (!client || client.statut === 'actif') return false
  if (client.email_contact) {
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(client.email_contact, {
      redirectTo: 'https://la-gabare.fr/bienvenue.html',
    })
    // Compte déjà créé (invitation précédente) : pas une erreur
    if (error && !/already|registered|exists/i.test(error.message)) throw new Error(`invitation espace client : ${error.message}`)
  }
  await supabaseAdmin.from('clients').update({ statut: 'actif' }).eq('id', client.id)
  const { notifier } = await import('@/lib/notifier')
  await notifier({ titre: `Client activé — premier paiement reçu`, corps: client.email_contact || undefined, niveau: 'success', url: `https://admin.la-gabare.fr/clients/${client.id}`, id: `client-actif-${client.id}` })
  return true
}
