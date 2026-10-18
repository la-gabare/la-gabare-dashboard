import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getClientFromRequest } from '@/lib/auth-client'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'
import { stripe } from '@/lib/stripe'
import { sendMail } from '@/lib/mailer'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return corsPreflight()
}

const json = (data: unknown, status = 200) => withCors(NextResponse.json(data, { status }))
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const AGENCE = process.env.AGENCE_NOTIF_EMAIL || process.env.SMTP_USER || ''
const FORMULES: Record<string, string> = { village: 'Village', reserve: 'Réserve', grand_cru: 'Grand Cru' }
const PRIX_HT: Record<string, number> = { village: 150, reserve: 350, grand_cru: 550 }
const TVA_PCT = Number(process.env.AGENCE_TVA_TAUX ?? 20)
const dateFr = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// CGV : 12 mois d'engagement initial, puis mois par mois ; résiliation avec préavis de deux mois
const ENGAGEMENT_MOIS = 12
const PREAVIS_MOIS = 2
const plusMois = (d: Date, n: number) => { const r = new Date(d); r.setMonth(r.getMonth() + n); return r }

async function abonnementStripe(customer: string | null) {
  if (!customer) return null
  const { data } = await stripe.subscriptions.list({ customer, status: 'all', limit: 5 })
  return data.find((s) => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status)) || null
}

function dates(client: Record<string, any>, sub: Stripe.Subscription | null) {
  const debut = sub ? new Date(sub.start_date * 1000) : client.date_debut_abonnement ? new Date(client.date_debut_abonnement) : null
  const finEngagement = debut ? plusMois(debut, ENGAGEMENT_MOIS) : null
  const auPlusTot = plusMois(new Date(), PREAVIS_MOIS)
  const effet = finEngagement && finEngagement > auPlusTot ? finEngagement : auPlusTot
  return { debut, finEngagement, effet }
}

// Portail Stripe limité : carte bancaire, coordonnées, factures (la résiliation suit les CGV, pas un clic)
async function configurationPortail() {
  const { data } = await stripe.billingPortal.configurations.list({ active: true, limit: 20 })
  const existante = data.find((c) => c.metadata?.gabare === 'espace-client')
  if (existante) return existante.id
  const c = await stripe.billingPortal.configurations.create({
    business_profile: { headline: 'La Gabare — votre abonnement' },
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ['email', 'address', 'tax_id'] },
      subscription_cancel: { enabled: false },
    },
    metadata: { gabare: 'espace-client' },
  })
  return c.id
}

export async function GET(req: NextRequest) {
  const r = await getClientFromRequest(req)
  if (r.error || !r.client) return json({ error: r.error }, r.status || 401)
  const c = r.client
  let sub: Stripe.Subscription | null = null
  try { sub = await abonnementStripe(c.stripe_customer_id) } catch (e) { console.error('client-abonnement', e) }
  const { finEngagement, effet } = dates(c, sub)
  const item = sub?.items.data[0]
  return json({
    formule: c.abonnement ? FORMULES[c.abonnement] || c.abonnement : null,
    actif: Boolean(sub),
    montant_cents: item?.price?.unit_amount ?? null,
    prochain_prelevement: sub && !sub.cancel_at && item ? new Date(item.current_period_end * 1000).toISOString() : null,
    fin_engagement: finEngagement?.toISOString() || null,
    resiliation: c.resiliation_demandee_at
      ? { demandee_at: c.resiliation_demandee_at, effet: c.date_fin_abonnement || (sub?.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null) }
      : null,
    resiliation_possible_au: effet.toISOString(),
    changement_demande: c.changement_formule_demande || null,
    portail: Boolean(c.stripe_customer_id),
  })
}

export async function POST(req: NextRequest) {
  const r = await getClientFromRequest(req)
  if (r.error || !r.client) return json({ error: r.error }, r.status || 401)
  const c = r.client
  const body = await req.json().catch(() => ({}))

  try {
    if (body.action === 'portail') {
      if (!c.stripe_customer_id) return json({ error: 'Aucun moyen de paiement enregistré pour le moment.' }, 400)
      const s = await stripe.billingPortal.sessions.create({
        customer: c.stripe_customer_id,
        configuration: await configurationPortail(),
        return_url: 'https://la-gabare.fr/espace-client.html',
        locale: 'fr',
      })
      return json({ url: s.url })
    }

    if (body.action === 'changer') {
      const formule = String(body.formule || '')
      if (!FORMULES[formule] || formule === c.abonnement) return json({ error: 'Choisissez une autre formule.' }, 400)
      if (c.resiliation_demandee_at) return json({ error: 'Votre abonnement est en cours de résiliation : écrivez-nous pour le modifier.' }, 400)

      // Changement automatique : nouveau tarif appliqué dans Stripe à partir du prochain prélèvement (sans prorata)
      const montantCents = Math.round(PRIX_HT[formule] * (1 + TVA_PCT / 100) * 100)
      const sub = await abonnementStripe(c.stripe_customer_id)
      let effet: Date | null = null
      if (sub) {
        const item = sub.items.data[0]
        const product = typeof item.price.product === 'string' ? item.price.product : item.price.product.id
        await stripe.products.update(product, { name: `La Gabare — ${FORMULES[formule]} — ${c.nom_domaine}` })
        await stripe.subscriptions.update(sub.id, {
          items: [{ id: item.id, price_data: { currency: 'eur', product, unit_amount: montantCents, recurring: { interval: 'month' } } }],
          proration_behavior: 'none',
          metadata: { formule },
        })
        effet = new Date(item.current_period_end * 1000)
      }
      const ancienne = FORMULES[c.abonnement] || c.abonnement || '?'
      await supabaseAdmin.from('clients').update({ abonnement: formule, changement_formule_demande: null }).eq('id', c.id)

      const quand = effet ? `à partir du prélèvement du ${dateFr(effet)}` : 'dès le démarrage de votre abonnement'
      if (c.email_contact) {
        await sendMail(c.email_contact, `Votre nouvelle formule ${FORMULES[formule]} — ${c.nom_domaine}`,
          `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A3E37;max-width:560px;">
           <p>Bonjour,</p><p>Votre abonnement passe de la formule ${esc(ancienne)} à la formule <strong>${FORMULES[formule]}</strong>
           (${(montantCents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} par mois), ${quand}.
           Votre prochain plan éditorial suivra la nouvelle formule.</p><p>L'équipe La Gabare</p></div>`,
          { fromName: 'La Gabare', replyTo: AGENCE || undefined })
      }
      if (AGENCE) {
        await sendMail(AGENCE, `Formule changée — ${c.nom_domaine} : ${ancienne} → ${FORMULES[formule]}`,
          `<p style="font-family:Arial,sans-serif;font-size:14px;">${esc(c.nom_domaine)} est passé à la formule <strong>${FORMULES[formule]}</strong>
           depuis son espace client. Fait automatiquement : ${sub ? `tarif Stripe mis à jour (${quand})` : 'aucun abonnement Stripe en cours'}, fiche client à jour.</p>
           <p style="font-family:Arial,sans-serif;font-size:14px;"><a href="https://admin.la-gabare.fr/clients/${c.id}">Ouvrir la fiche client</a></p>`,
          { fromName: 'La Gabare — Abonnements', replyTo: c.email_contact || undefined })
      }
      return json({ ok: true, formule: FORMULES[formule], effet: effet?.toISOString() || null })
    }

    if (body.action === 'resilier') {
      if (c.resiliation_demandee_at) return json({ error: 'Votre demande de résiliation est déjà enregistrée.' }, 400)
      const sub = await abonnementStripe(c.stripe_customer_id)
      const { effet } = dates(c, sub)
      // Stripe arrête les prélèvements à la date d'effet (préavis et engagement des CGV respectés)
      if (sub) await stripe.subscriptions.update(sub.id, { cancel_at: Math.floor(effet.getTime() / 1000), metadata: { resiliation: 'espace-client' } })
      await supabaseAdmin.from('clients').update({
        resiliation_demandee_at: new Date().toISOString(), date_fin_abonnement: effet.toISOString().slice(0, 10),
      }).eq('id', c.id)
      const motif = String(body.motif || '').trim().slice(0, 2000)
      if (c.email_contact) {
        await sendMail(c.email_contact, `Votre demande de résiliation — ${c.nom_domaine}`,
          `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A3E37;max-width:560px;">
           <p>Bonjour,</p><p>Nous avons bien reçu votre demande de résiliation de l'abonnement ${esc(FORMULES[c.abonnement] || '')}
           le ${dateFr(new Date())}. Conformément à nos conditions générales, elle prendra effet le <strong>${dateFr(effet)}</strong> :
           l'accompagnement et les prélèvements se poursuivent jusqu'à cette date, puis s'arrêtent automatiquement.</p>
           <p>Votre site reste le vôtre. Si vous changez d'avis, répondez simplement à ce message.</p><p>L'équipe La Gabare</p></div>`,
          { fromName: 'La Gabare', replyTo: AGENCE || undefined })
      }
      if (AGENCE) {
        await sendMail(AGENCE, `Résiliation demandée — ${c.nom_domaine} (effet le ${dateFr(effet)})`,
          `<p style="font-family:Arial,sans-serif;font-size:14px;">${esc(c.nom_domaine)} a demandé la résiliation de son abonnement depuis son espace client.
           Effet le ${dateFr(effet)}${sub ? ' (arrêt des prélèvements programmé dans Stripe)' : ' — aucun abonnement Stripe trouvé, à vérifier'}.</p>
           ${motif ? `<p style="font-family:Arial,sans-serif;font-size:14px;">Motif : ${esc(motif)}</p>` : ''}
           <p style="font-family:Arial,sans-serif;font-size:14px;"><a href="https://admin.la-gabare.fr/clients/${c.id}">Ouvrir la fiche client</a></p>`,
          { fromName: 'La Gabare — Abonnements', replyTo: c.email_contact || undefined })
      }
      return json({ ok: true, effet: effet.toISOString() })
    }

    return json({ error: 'Action inconnue' }, 400)
  } catch (err) {
    console.error('client-abonnement', err)
    // Message Stripe renvoyé pour le diagnostic (pas de donnée sensible dans ces messages)
    const detail = err instanceof Stripe.errors.StripeError ? err.message : undefined
    return json({ error: 'Opération impossible pour le moment. Écrivez-nous : contact@la-gabare.fr', detail }, 500)
  }
}
