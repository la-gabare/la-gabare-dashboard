import 'server-only'
import crypto from 'crypto'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'

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

const sans = "font-family:Arial,sans-serif"
const serif = "font-family:Georgia,'Cormorant Garamond',serif"

function gabarit(surtitre: string, titre: string, corps: string, bouton: string, lien: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EDE9E2;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#F5F2EC;border:1px solid rgba(26,19,16,0.1);">
<tr><td style="background-color:#1A1310;padding:32px 40px;text-align:center;"><span style="${serif};font-size:24px;letter-spacing:0.04em;color:#F5F2EC;">La Gabare</span></td></tr>
<tr><td style="height:3px;background:linear-gradient(90deg,#5A1226,#B08D57);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:44px 40px 36px 40px;">
  <p style="margin:0 0 6px 0;${sans};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#B08D57;">${surtitre}</p>
  <h1 style="margin:0 0 20px 0;${serif};font-weight:400;font-size:26px;color:#1A1310;">${titre}</h1>
  ${corps}
  <a href="${lien}" style="display:inline-block;padding:14px 32px;background-color:#5A1226;color:#F5F2EC;${sans};font-size:15px;font-weight:600;text-decoration:none;">${bouton} &rarr;</a>
  <p style="margin:24px 0 0 0;${sans};font-size:13px;line-height:1.6;color:#4A3E37;">Vous pouvez régler par carte bancaire ou par virement : la page de paiement vous indique l'IBAN à utiliser.</p>
</td></tr>
<tr><td style="background-color:#1A1310;padding:24px 40px;text-align:center;"><p style="margin:0;${sans};font-size:11px;color:rgba(245,242,236,0.5);">La Gabare — Agence pour les domaines viticoles de la Loire</p></td></tr>
</table></td></tr></table>`
}

const para = (t: string) => `<p style="margin:0 0 24px 0;${sans};font-size:15px;line-height:1.7;color:#4A3E37;">${t}</p>`
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export async function envoyerEcheance(e: Echeance, relance = false) {
  const { data: client } = await supabaseAdmin.from('clients').select('nom_domaine, email_contact').eq('id', e.client_id).single()
  if (!client?.email_contact) throw new Error('Ce client n\'a pas d\'adresse e-mail')
  const nom = esc(client.nom_domaine)
  const montant = `<strong style="color:#1A1310;">${euros(e.montant_cents)}</strong>`
  const html = relance
    ? gabarit('Rappel', `${nom}, petit rappel.`,
        para(`Sauf erreur de notre part, le versement « ${esc(e.libelle)} » de ${montant} pour votre site n'a pas encore été reçu.
          Si vous l'avez déjà réglé, merci de ne pas tenir compte de ce message.`),
        'Régler le versement', lienPaiement(e))
    : gabarit('Votre paiement', `${nom}, ${e.ordre === 1 ? 'lançons votre projet.' : 'votre site avance.'}`,
        para(`Voici le lien de paiement sécurisé pour le versement « ${esc(e.libelle)} » de ${montant}.
          ${e.ordre === 1 ? 'Dès réception, nous lançons la création de votre site et vous recevez l\'accès à votre espace personnel.' : ''}`),
        'Procéder au paiement', lienPaiement(e))
  await sendMail(client.email_contact,
    `${relance ? 'Rappel — ' : ''}${e.libelle} — ${client.nom_domaine}`, html, { fromName: 'La Gabare' })
}

// Versement réglé : marque payé, active le client au premier paiement et envoie l'accès à son espace
export async function marquerPayee(echeanceId: number, moyen: string) {
  const { data: e } = await supabaseAdmin.from('echeances')
    .update({ statut: 'paye', paye_at: new Date().toISOString(), moyen })
    .eq('id', echeanceId).neq('statut', 'paye').select().single()
  if (!e) return null // déjà payé (webhook reçu deux fois)
  await activerClient(e.client_id)
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

export async function activerClient(clientId: number | string) {
  const { data: client } = await supabaseAdmin.from('clients')
    .select('id, statut, email_contact').eq('id', clientId).single()
  if (!client || client.statut === 'actif') return
  await supabaseAdmin.from('clients').update({ statut: 'actif' }).eq('id', client.id)
  const { notifier } = await import('@/lib/notifier')
  await notifier({ titre: `Client activé — premier paiement reçu`, corps: client.email_contact || undefined, niveau: 'success', url: `https://admin.la-gabare.fr/clients/${client.id}`, id: `client-actif-${client.id}` })
  if (client.email_contact) {
    await supabaseAdmin.auth.admin.inviteUserByEmail(client.email_contact, {
      redirectTo: 'https://la-gabare.fr/bienvenue.html',
    })
  }
}
