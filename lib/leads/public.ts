import 'server-only'

// Champs acceptés depuis les formulaires publics du site (tout le reste est ignoré)
export const CHAMPS_LEAD = [
  'domaine', 'appellation', 'surface', 'directe', 'site', 'url', 'reseaux', 'besoins', 'budget', 'echeance',
  'nom', 'email', 'tel', 'message', 'pack_demande', 'style_visuel', 'couleurs_souhaitees', 'liste_cuvees',
  'slogan', 'type_demande',
] as const

export const CHAMPS_BRIEF_TEXTE = [
  'nom_domaine', 'appellation', 'slogan', 'presentation', 'liste_cuvees', 'site_existant', 'site_url',
  'instagram_handle', 'facebook_page', 'tiktok_handle', 'manager', 'budget_actuel', 'concurrents', 'positionnement',
  'kpi_12mois', 'budget_solution', 'urgence', 'kpis', 'type_site', 'style_visuel', 'couleurs', 'lien_inspirations',
  'photos_disponibles', 'frequence_publication', 'reseaux_prioritaires', 'messages_cles', 'blog_souhaite', 'loi_evin',
  'certifications', 'restrictions', 'remarques', 'nom_contact', 'fonction', 'telephone', 'email', 'decision_maker',
  'disponibilite', 'source',
] as const

export const CHAMPS_BRIEF_BOOLEENS = [
  'reseau_instagram', 'reseau_facebook', 'reseau_linkedin', 'reseau_tiktok',
  'cible_particuliers', 'cible_cavistes', 'cible_restaurants', 'cible_export', 'cible_professionnels',
  'obj_vente', 'obj_visibilite', 'obj_fidelite', 'obj_recrutement', 'obj_engagement', 'obj_conformite',
  'contenu_textes', 'contenu_photos', 'contenu_videos', 'contenu_documents', 'contenu_rien',
] as const

export function texte(v: unknown, max = 3000): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s ? s.slice(0, max) : null
}

export function emailValide(e: string | null): boolean {
  return Boolean(e && e.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e))
}

// Limite simple anti-abus par adresse IP (par instance serveur) : N envois par fenêtre
const compteurs = new Map<string, { n: number; debut: number }>()
export function tropDeRequetes(ip: string, max = 5, fenetreMs = 10 * 60 * 1000): boolean {
  const now = Date.now()
  const c = compteurs.get(ip)
  if (!c || now - c.debut > fenetreMs) {
    compteurs.set(ip, { n: 1, debut: now })
    return false
  }
  c.n += 1
  return c.n > max
}

export function ipDe(req: Request): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'inconnue'
}
