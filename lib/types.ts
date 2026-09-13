export interface Lead {
  id: number
  created_at: string
  domaine: string
  appellation?: string
  surface?: string
  directe?: string
  site?: string
  url?: string
  reseaux?: string
  besoins?: string
  budget?: string
  echeance?: string
  nom: string
  email: string
  tel?: string
  message?: string
  consent: boolean
  traite?: boolean
}

export interface AuditGratuit {
  id: string
  created_at: string
  nom: string
  email: string
  content: string
  social: string
  avis: string
  site: string
  manager: string
  recommendation: string
  email_sent?: boolean
  webhook_sent?: boolean
  nom_domaine?: string
  nom_contact?: string
  telephone?: string
  traite?: boolean
}

export interface FormulaireComplet {
  id: number
  created_at: string
  nom_domaine: string
  appellation?: string
  slogan?: string
  presentation?: string
  liste_cuvees?: string
  site_existant?: string
  site_url?: string
  reseau_instagram?: boolean
  instagram_handle?: string
  reseau_facebook?: boolean
  facebook_page?: string
  reseau_linkedin?: boolean
  reseau_tiktok?: boolean
  tiktok_handle?: string
  manager?: string
  budget_actuel?: string
  cible_particuliers?: boolean
  cible_cavistes?: boolean
  cible_restaurants?: boolean
  cible_export?: boolean
  cible_professionnels?: boolean
  concurrents?: string
  positionnement?: string
  obj_vente?: boolean
  obj_visibilite?: boolean
  obj_fidelite?: boolean
  obj_recrutement?: boolean
  obj_engagement?: boolean
  obj_conformite?: boolean
  kpi_12mois?: string
  budget_solution?: string
  urgence?: string
  kpis?: string
}

export interface CahierDesCharges {
  id: number
  created_at: string
  pack_choisi?: string
  nom_domaine?: string
  appellation?: string
  slogan?: string
  style_visuel?: string
  couleurs_souhaitees?: string
  lien_photos?: string
  liste_cuvees?: string
  fonctionnalites?: string[]
  nom_contact?: string
  telephone?: string
  email?: string
  remarques_prompt?: string
  traite?: boolean
  consent_cgv: boolean
}

export interface Client {
  id: number
  created_at: string
  cahier_id?: number
  nom_domaine: string
  email_contact: string
  appellation?: string
  region?: string
  type_vin?: string
  cepages?: string[]
  style?: string
  points_forts?: string
  histoire?: string
  public_cible?: string
  tone_voix?: string
  abonnement: string
  date_debut_abonnement?: string
  date_fin_abonnement?: string
  statut?: string
  profil_client_complet?: Record<string, unknown>
}

export interface Article {
  id: number
  created_at: string
  client_id: number
  plan_editorial_id?: number
  titre: string
  contenu?: string
  angle?: string
  seo_keywords?: string[]
  consignes_photo?: string
  image_ref_gemini?: string
  date_publication_prevue?: string
  status?: string
  date_publication_reelle?: string
}

export interface Post {
  id: number
  created_at: string
  article_id?: number
  client_id: number
  contenu: string
  reseau?: string
  format?: string
  hashtags?: string[]
  cta?: string
  date_publication_prevue?: string
  status?: string
  date_publication_reelle?: string
}

export interface Newsletter {
  id: number
  created_at: string
  client_id: number
  mois: string
  contenu?: string
  articles_inclus?: number[]
  status?: string
}

export interface Publication {
  id: number
  created_at: string
  post_id?: number
  client_id: number
  reseau?: string
  date_publication?: string
  url_publication?: string
  impressions?: number
  engagements?: number
}
