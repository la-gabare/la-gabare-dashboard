export interface Signal {
  k: string
  label: string
  tone: 'hot' | 'warm' | 'ok' | 'info' | 'bad' | ''
}

export interface AuditResult {
  error?: string
  tried?: string[]
  final_url?: string
  https?: boolean
  ssl_invalid?: boolean
  http_status?: number
  load_s?: number
  size_kb?: number
  generator?: string | null
  cms?: string | null
  cms_tier?: 'low' | 'pro' | null
  viewport?: boolean
  doctype_html5?: boolean
  legacy?: string[]
  jquery_old?: boolean
  copyright_year?: number | null
  last_modified?: string | null
  title?: string
  meta_desc?: boolean
  og?: boolean
  schema_org?: boolean
  lang_en?: boolean
  shop?: boolean
  age_gate?: boolean
  sanitary?: boolean
  tourism?: boolean
  booking?: boolean
  blog?: boolean
  form?: boolean
  socials?: Record<string, string>
  obsolescence?: number
  issues?: string[]
  goods?: string[]
  psi?: { perf: number | null; lcp?: string; cls?: string; tbt?: string }
}

export interface Gbp {
  found: boolean
  website?: string | null
  rating?: number | null
  reviews?: number | null
  phone?: string | null
  title?: string
}

export interface Prospect {
  siren: string
  siret?: string | null
  name: string
  brand?: string | null
  legal?: string | null
  legal_code?: string | null
  naf?: string | null
  address?: string | null
  cp?: string | null
  commune?: string | null
  dept: string
  zone?: string | null
  lat?: number | null
  lon?: number | null
  created?: string | null
  eff_code?: string | null
  eff_mid?: number | null
  nb_etab?: number | null
  nb_open?: number | null
  bio?: number
  dirigeant?: string | null
  dir_first?: string | null
  dir_birth?: number | null
  successor?: number
  ca?: number | null
  ca_prev?: number | null
  ca_year?: number | null
  resultat?: number | null
  coop?: number
  vinifie?: number
  url?: string | null
  url_source?: string | null
  url_verified?: number
  site_status: string
  site_checked?: string | null
  email?: string | null
  phone?: string | null
  socials?: Record<string, string> | null
  audit?: AuditResult | null
  audit_at?: string | null
  gbp?: Gbp | null
  status: string
  notes?: string | null
  next_action?: string | null
  last_contact?: string | null
  score: number
  prio: string
  pack?: string | null
  abo?: string | null
  deal: number
  mrr: number
  signals: Signal[]
  breakdown: Record<string, number>
  growth?: number
  coopteur?: number
  obs?: number | null
  f_no_social?: number
  f_no_shop?: number
  f_no_evin?: number
  f_no_mobile?: number
  f_no_https?: number
  f_tourism?: number
  created_at?: string
  updated_at?: string
}

export interface Settings {
  sender_name: string
  company: string
  sender_email: string
  phone: string
  site: string
  calendar: string
  serper_key: string
}
