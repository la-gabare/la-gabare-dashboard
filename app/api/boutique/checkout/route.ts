import { NextRequest, NextResponse } from 'next/server'
import { stripeBoutique as stripe } from '@/lib/boutique/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'
import { clientParDomaine, fraisPort, siteBase, BoutiqueConfig, LigneCommande, Produit } from '@/lib/boutique/core'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return corsPreflight()
}

function erreur(message: string, status = 400) {
  return withCors(NextResponse.json({ error: message }, { status }))
}

// Crée une session Stripe Checkout sur le compte Stripe du domaine (Stripe Connect, paiement direct).
// Le stock est réservé immédiatement et rendu si la session expire (voir stripe-connect-webhook).
export async function POST(req: NextRequest) {
  let body: { domain?: string; items?: { id: number; quantite: number }[]; majeur?: boolean; mode?: string }
  try {
    body = await req.json()
  } catch {
    return erreur('Requête invalide')
  }

  const { domain, items, majeur } = body
  const mode = body.mode === 'retrait' ? 'retrait' : 'livraison'
  if (!domain || !Array.isArray(items) || items.length === 0) return erreur('Panier vide')
  if (majeur !== true) return erreur('La vente d\'alcool est réservée aux personnes majeures.')
  if (items.length > 30) return erreur('Panier trop volumineux')

  const quantites = new Map<number, number>()
  for (const it of items) {
    const id = Number(it?.id)
    const q = Number(it?.quantite)
    if (!Number.isInteger(id) || !Number.isInteger(q) || q < 1 || q > 120) return erreur('Quantité invalide')
    quantites.set(id, (quantites.get(id) || 0) + q)
  }

  const client = await clientParDomaine(domain)
  if (!client?.boutique_active || !client.stripe_account_id) {
    return erreur('La boutique de ce domaine n\'est pas encore ouverte.', 403)
  }
  const config = (client.boutique_config || {}) as BoutiqueConfig
  if (mode === 'retrait' && config.retrait_caveau === false) return erreur('Le retrait au caveau n\'est pas proposé.')

  const { data: produits } = await supabaseAdmin
    .from('produits')
    .select('*')
    .eq('client_id', client.id)
    .eq('actif', true)
    .in('id', Array.from(quantites.keys()))

  const parId = new Map<number, Produit>((produits || []).map(p => [p.id, p as Produit]))
  const lignes: LigneCommande[] = []
  for (const [id, quantite] of quantites) {
    const p = parId.get(id)
    if (!p) return erreur('Une cuvée de votre panier n\'est plus disponible. Rechargez la page.', 409)
    if (p.stock < quantite) {
      return erreur(p.stock > 0
        ? `Il ne reste que ${p.stock} × ${p.nom}.`
        : `${p.nom} est en rupture de stock.`, 409)
    }
    lignes.push({
      produit_id: p.id,
      nom: p.nom,
      millesime: p.millesime,
      prix_cents: p.prix_cents,
      quantite,
      bouteilles: quantite * p.bouteilles_par_unite,
    })
  }

  const bouteilles = lignes.reduce((s, l) => s + l.bouteilles, 0)
  const maxBouteilles = config.max_bouteilles || 36
  if (bouteilles > maxBouteilles) {
    return erreur(`Les commandes en ligne sont limitées à ${maxBouteilles} bouteilles. Contactez le domaine pour une commande plus importante.`)
  }
  const sousTotal = lignes.reduce((s, l) => s + l.prix_cents * l.quantite, 0)
  const port = mode === 'retrait' ? 0 : fraisPort(config, bouteilles)
  if (port === null) return erreur('Ce volume ne peut pas être expédié en ligne. Contactez le domaine.')

  // Réservation atomique du stock + création de la commande en attente
  const { data: commandeId, error: resaError } = await supabaseAdmin.rpc('boutique_reserver', {
    p_client_id: client.id,
    p_lignes: lignes,
    p_sous_total: sousTotal,
    p_frais_port: port,
    p_livraison: { mode },
  })
  if (resaError || !commandeId) {
    if (resaError?.message?.includes('stock_insuffisant')) {
      return erreur('Une cuvée vient d\'être épuisée. Rechargez la page.', 409)
    }
    console.error('boutique_reserver', resaError)
    return erreur('Erreur lors de la réservation du stock.', 500)
  }

  const base = siteBase(client)
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'fr',
      line_items: lignes.map(l => ({
        quantity: l.quantite,
        price_data: {
          currency: 'eur',
          unit_amount: l.prix_cents,
          product_data: { name: l.millesime ? `${l.nom} ${l.millesime}` : l.nom },
        },
      })),
      shipping_address_collection: mode === 'livraison' ? { allowed_countries: ['FR'] } : undefined,
      shipping_options: [{
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: port, currency: 'eur' },
          display_name: mode === 'retrait' ? 'Retrait au caveau' : `Livraison à domicile (${bouteilles} bouteille${bouteilles > 1 ? 's' : ''})`,
        },
      }],
      phone_number_collection: { enabled: true },
      custom_text: {
        submit: {
          message: 'En validant, vous certifiez avoir 18 ans révolus et accepter les conditions générales de vente du domaine. L\'abus d\'alcool est dangereux pour la santé, à consommer avec modération.',
        },
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      metadata: { commande_id: commandeId, client_id: String(client.id), source: 'boutique' },
      payment_intent_data: { metadata: { commande_id: commandeId, client_id: String(client.id) } },
      success_url: `${base}/merci-commande.html?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/boutique.html?annule=1`,
    }, { stripeAccount: client.stripe_account_id })

    await supabaseAdmin.from('commandes').update({ stripe_session_id: session.id }).eq('id', commandeId)
    return withCors(NextResponse.json({ url: session.url }))
  } catch (err) {
    console.error('checkout stripe', err)
    await supabaseAdmin.rpc('boutique_liberer', { p_commande_id: commandeId })
    return erreur('Le paiement est momentanément indisponible. Réessayez dans quelques minutes.', 502)
  }
}
