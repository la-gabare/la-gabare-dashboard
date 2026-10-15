import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface Produit {
  id: number
  client_id: number
  slug: string
  nom: string
  millesime: string | null
  couleur: string | null
  appellation: string | null
  contenance: string | null
  description: string | null
  accords: string | null
  prix_cents: number
  tva_taux: number
  bouteilles_par_unite: number
  stock: number
  seuil_alerte: number
  image_url: string | null
  actif: boolean
  ordre: number
}

export interface PalierPort { jusqua: number; prix: number } // prix en centimes, jusqu'à N bouteilles

export interface BoutiqueConfig {
  frais_port?: PalierPort[]
  franco_bouteilles?: number | null
  retrait_caveau?: boolean
  email_notif?: string
  max_bouteilles?: number
  cgv_url?: string
}

export interface LigneCommande {
  produit_id: number
  nom: string
  millesime: string | null
  prix_cents: number
  quantite: number
  bouteilles: number
}

// Grille par défaut (colissimo vin, France métropolitaine), modifiable par domaine
export const PORT_DEFAUT: PalierPort[] = [
  { jusqua: 3, prix: 1290 },
  { jusqua: 6, prix: 1590 },
  { jusqua: 12, prix: 1990 },
  { jusqua: 18, prix: 2690 },
  { jusqua: 36, prix: 3990 },
]

export const PRODUIT_COLONNES_PUBLIQUES =
  'id, slug, nom, millesime, couleur, appellation, contenance, description, accords, prix_cents, bouteilles_par_unite, stock, image_url, ordre'

export function fraisPort(config: BoutiqueConfig, bouteilles: number): number | null {
  if (bouteilles <= 0) return 0
  if (config.franco_bouteilles && bouteilles >= config.franco_bouteilles) return 0
  const grille = [...(config.frais_port?.length ? config.frais_port : PORT_DEFAUT)].sort((a, b) => a.jusqua - b.jusqua)
  const palier = grille.find(p => bouteilles <= p.jusqua)
  return palier ? palier.prix : null // null = au-delà de la grille, envoi impossible
}

export function normaliserDomaine(d: string): string {
  return d.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')
}

// Même règle que create-client-project : "<domaine>2309", sauf token propre au client
export function publishToken(client: { publish_token?: string | null; domaine?: string | null; site_url?: string | null }): string {
  if (client.publish_token) return client.publish_token
  return `${normaliserDomaine(client.domaine || client.site_url || 'site')}2309`
}

export async function clientParDomaine(domaine: string) {
  const d = normaliserDomaine(domaine)
  const { data } = await supabaseAdmin
    .from('clients')
    .select('id, nom_domaine, domaine, site_url, email_contact, boutique_active, stripe_account_id, boutique_config, publish_token')
    .in('domaine', [d, `www.${d}`])
    .limit(1)
  return data?.[0] || null
}

export function euros(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
}

export function siteBase(client: { site_url?: string | null; domaine?: string | null }): string {
  const raw = client.site_url || client.domaine || ''
  return `https://${normaliserDomaine(raw)}`
}
