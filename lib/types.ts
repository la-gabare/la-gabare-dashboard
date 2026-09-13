export interface Prospect {
  id: string
  nom: string
  email: string
  phone?: string
  entreprise?: string
  budget?: number
  timeline?: string
  source?: string
  score?: number
  statut: string
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  nom: string
  email: string
  phone?: string
  entreprise?: string
  pack: string
  ca_mensuel?: number
  date_signature: string
  statut: string
  created_at: string
  updated_at: string
}

export interface Offre {
  id: string
  prospect_id?: string
  client_id?: string
  type: string
  montant: number
  statut: string
  date_creation: string
  date_expiration?: string
  created_at: string
  updated_at: string
}

export interface Article {
  id: string
  client_id: string
  titre: string
  angle: string
  contenu: string
  seo_keyword?: string
  date_pub?: string
  statut: string
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  client_id: string
  titre: string
  type: string
  angle: string
  contenu: string
  legende: string
  date_pub?: string
  statut: string
  created_at: string
  updated_at: string
}
