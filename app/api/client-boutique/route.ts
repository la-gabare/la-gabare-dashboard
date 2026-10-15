import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClientFromRequest } from '@/lib/auth-client'
import { withCors, corsPreflight } from '@/lib/cors'
import { stripeBoutique as stripe, messageStripe } from '@/lib/boutique/stripe'
import { sendMail } from '@/lib/mailer'
import { BoutiqueConfig, PORT_DEFAUT, Produit, slugify } from '@/lib/boutique/core'
import { mailExpedition } from '@/lib/boutique/emails'
import { publierBoutique } from '@/lib/boutique/publier'

export const dynamic = 'force-dynamic'

const STATUTS_SUIVIS = ['payee', 'preparee', 'expediee', 'livree', 'annulee']

export async function OPTIONS() {
  return corsPreflight()
}

function json(data: unknown, status = 200) {
  return withCors(NextResponse.json(data, { status }))
}

async function auth(req: NextRequest) {
  const result = await getClientFromRequest(req)
  if ('error' in result) return { res: json({ error: result.error }, result.status) }
  if (!result.client.boutique_active) return { res: json({ error: 'La boutique n\'est pas incluse dans votre offre.' }, 403) }
  return { client: result.client }
}

async function etatStripe(accountId: string | null) {
  if (!accountId) return { connecte: false, paiements_actifs: false }
  try {
    const acct = await stripe.accounts.retrieve(accountId)
    return { connecte: true, paiements_actifs: Boolean(acct.charges_enabled), dossier_complet: Boolean(acct.details_submitted) }
  } catch {
    return { connecte: false, paiements_actifs: false, erreur: 'Compte Stripe introuvable' }
  }
}

// Tableau de bord boutique : produits, commandes, réglages, stats
export async function GET(req: NextRequest) {
  const a = await auth(req)
  if ('res' in a) return a.res
  const { client } = a

  const debutMois = new Date()
  debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0)

  const [produitsRes, commandesRes, stripeEtat] = await Promise.all([
    supabaseAdmin.from('produits').select('*').eq('client_id', client.id).order('ordre').order('id'),
    supabaseAdmin.from('commandes').select('*').eq('client_id', client.id)
      .in('statut', STATUTS_SUIVIS).order('paid_at', { ascending: false }).limit(300),
    etatStripe(client.stripe_account_id),
  ])

  const commandes = commandesRes.data || []
  const valides = commandes.filter(c => c.statut !== 'annulee')
  const duMois = valides.filter(c => c.paid_at && new Date(c.paid_at) >= debutMois)
  const ventesParProduit = new Map<number, number>()
  for (const c of valides) for (const l of c.lignes || []) {
    ventesParProduit.set(l.produit_id, (ventesParProduit.get(l.produit_id) || 0) + l.quantite)
  }

  const config = (client.boutique_config || {}) as BoutiqueConfig
  return json({
    stripe: stripeEtat,
    config: {
      frais_port: config.frais_port?.length ? config.frais_port : PORT_DEFAUT,
      franco_bouteilles: config.franco_bouteilles ?? null,
      retrait_caveau: config.retrait_caveau !== false,
      email_notif: config.email_notif || client.email_contact,
      max_bouteilles: config.max_bouteilles || 36,
      cgv_url: config.cgv_url || '',
    },
    produits: produitsRes.data || [],
    commandes,
    stats: {
      ca_mois_cents: duMois.reduce((s, c) => s + c.total_cents, 0),
      commandes_mois: duMois.length,
      panier_moyen_cents: duMois.length ? Math.round(duMois.reduce((s, c) => s + c.total_cents, 0) / duMois.length) : 0,
      a_traiter: commandes.filter(c => c.statut === 'payee' || c.statut === 'preparee').length,
      ventes_par_produit: Object.fromEntries(ventesParProduit),
    },
    site: client.domaine || client.site_url || '',
  })
}

function nettoyerProduit(p: Record<string, unknown>) {
  const texte = (v: unknown, max: number) => (v == null || v === '' ? null : String(v).slice(0, max))
  const entier = (v: unknown, min: number, max: number, def: number) => {
    const n = Math.round(Number(v))
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def
  }
  const nom = texte(p.nom, 120)
  if (!nom) throw new Error('Le nom de la cuvée est obligatoire')
  const prix = Math.round(Number(String(p.prix ?? '').replace(',', '.')) * 100)
  if (!Number.isFinite(prix) || prix <= 0) throw new Error('Le prix doit être supérieur à 0')
  return {
    nom,
    slug: slugify(texte(p.slug, 60) || `${nom} ${p.millesime || ''}`),
    millesime: texte(p.millesime, 10),
    couleur: texte(p.couleur, 40),
    appellation: texte(p.appellation, 120),
    contenance: texte(p.contenance, 20) || '75 cl',
    description: texte(p.description, 5000),
    accords: texte(p.accords, 1000),
    prix_cents: prix,
    bouteilles_par_unite: entier(p.bouteilles_par_unite, 1, 24, 1),
    stock: entier(p.stock, 0, 100000, 0),
    seuil_alerte: entier(p.seuil_alerte, 0, 10000, 12),
    image_url: texte(p.image_url, 1000),
    actif: p.actif !== false,
    ordre: entier(p.ordre, 0, 10000, 0),
    updated_at: new Date().toISOString(),
  }
}

export async function POST(req: NextRequest) {
  const a = await auth(req)
  if ('res' in a) return a.res
  const { client } = a

  let body: Record<string, any>
  try { body = await req.json() } catch { return json({ error: 'Requête invalide' }, 400) }

  try {
    switch (body.action) {
      case 'produit_enregistrer': {
        const champs = nettoyerProduit(body.produit || {})
        const id = Number(body.produit?.id)
        const q = id
          ? supabaseAdmin.from('produits').update(champs).eq('id', id).eq('client_id', client.id).select().single()
          : supabaseAdmin.from('produits').insert({ ...champs, client_id: client.id }).select().single()
        const { data, error } = await q
        if (error) return json({ error: error.code === '23505' ? 'Une cuvée porte déjà cette adresse (slug).' : error.message }, 400)
        return json({ produit: data })
      }

      case 'stock': {
        const stock = Math.max(0, Math.round(Number(body.stock)))
        if (!Number.isFinite(stock)) return json({ error: 'Stock invalide' }, 400)
        const { data, error } = await supabaseAdmin.from('produits')
          .update({ stock, updated_at: new Date().toISOString() })
          .eq('id', Number(body.id)).eq('client_id', client.id).select().single()
        if (error) return json({ error: error.message }, 400)
        return json({ produit: data })
      }

      case 'commande_statut': {
        const statut = String(body.statut)
        if (!STATUTS_SUIVIS.includes(statut)) return json({ error: 'Statut invalide' }, 400)
        const champs: Record<string, unknown> = {
          statut,
          transporteur: body.transporteur ? String(body.transporteur).slice(0, 60) : null,
          numero_suivi: body.numero_suivi ? String(body.numero_suivi).slice(0, 80) : null,
        }
        if (statut === 'expediee') champs.shipped_at = new Date().toISOString()
        const { data: avant } = await supabaseAdmin.from('commandes').select('statut')
          .eq('id', body.id).eq('client_id', client.id).single()
        if (!avant) return json({ error: 'Commande introuvable' }, 404)
        const { data, error } = await supabaseAdmin.from('commandes').update(champs)
          .eq('id', body.id).eq('client_id', client.id).select().single()
        if (error) return json({ error: error.message }, 400)
        let mail = false
        if (statut === 'expediee' && avant.statut !== 'expediee' && data.email && body.prevenir !== false) {
          const config = (client.boutique_config || {}) as BoutiqueConfig
          await sendMail(data.email, `Votre commande n° ${data.numero} est en route — ${client.nom_domaine}`,
            mailExpedition(client.nom_domaine, data), { fromName: client.nom_domaine, replyTo: config.email_notif || client.email_contact })
          mail = true
        }
        return json({ commande: data, mail_envoye: mail })
      }

      case 'config': {
        const c = body.config || {}
        const grille = Array.isArray(c.frais_port)
          ? c.frais_port
              .map((p: any) => ({ jusqua: Math.round(Number(p.jusqua)), prix: Math.round(Number(String(p.prix).replace(',', '.')) * 100) }))
              .filter((p: any) => p.jusqua > 0 && p.prix >= 0)
              .sort((x: any, y: any) => x.jusqua - y.jusqua)
          : undefined
        const config: BoutiqueConfig = {
          frais_port: grille?.length ? grille : PORT_DEFAUT,
          franco_bouteilles: Number(c.franco_bouteilles) > 0 ? Math.round(Number(c.franco_bouteilles)) : null,
          retrait_caveau: c.retrait_caveau !== false,
          email_notif: c.email_notif ? String(c.email_notif).slice(0, 200) : client.email_contact,
          max_bouteilles: Math.min(120, Math.max(1, Math.round(Number(c.max_bouteilles) || 36))),
          cgv_url: c.cgv_url ? String(c.cgv_url).slice(0, 300) : undefined,
        }
        const { error } = await supabaseAdmin.from('clients').update({ boutique_config: config }).eq('id', client.id)
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }

      case 'stripe_connecter': try {
        let accountId = client.stripe_account_id as string | null
        if (!accountId) {
          const acct = await stripe.accounts.create({
            type: 'standard',
            country: 'FR',
            email: client.email_contact,
            business_profile: { name: client.nom_domaine, product_description: 'Vente de vins du domaine' },
            metadata: { client_id: String(client.id) },
          })
          accountId = acct.id
          await supabaseAdmin.from('clients').update({ stripe_account_id: accountId }).eq('id', client.id)
        }
        const link = await stripe.accountLinks.create({
          account: accountId,
          type: 'account_onboarding',
          refresh_url: 'https://la-gabare.fr/espace-client.html?boutique=stripe',
          return_url: 'https://la-gabare.fr/espace-client.html?boutique=stripe',
        })
        return json({ url: link.url })
      } catch (err) {
        console.error('stripe_connecter', err)
        return json({ error: messageStripe(err) }, 502)
      }

      case 'publier': {
        const { data: produits } = await supabaseAdmin.from('produits').select('*')
          .eq('client_id', client.id).order('ordre').order('id')
        const res = await publierBoutique(client, (produits || []) as Produit[])
        return json(res, res.erreurs.length ? 207 : 200)
      }

      default:
        return json({ error: 'Action inconnue' }, 400)
    }
  } catch (err) {
    console.error('client-boutique', body?.action, err)
    return json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, 400)
  }
}
