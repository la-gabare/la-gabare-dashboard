import 'server-only'
import { COOP_CODES, EFF_MID, EMPLOYER_CODES, LEGAL, ZONES } from './constants'
import { safeJson } from './net'
import { titleCase } from './scoring'
import type { Prospect } from './types'

const API = 'https://recherche-entreprises.api.gouv.fr/search'

export type IdentityRow = Pick<
  Prospect,
  'siren' | 'siret' | 'name' | 'brand' | 'legal' | 'legal_code' | 'naf' | 'address' | 'cp' | 'commune' | 'dept' | 'zone' | 'lat' | 'lon' |
  'created' | 'eff_code' | 'eff_mid' | 'nb_etab' | 'nb_open' | 'bio' | 'dirigeant' | 'dir_first' | 'dir_birth' | 'successor' | 'ca' | 'ca_prev' |
  'ca_year' | 'resultat' | 'coop' | 'vinifie'
>

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

/** Convertit un résultat SIRENE en fiche. null pour les entreprises non diffusibles (données masquées). */
export function leadFromSirene(r: any): IdentityRow | null {
  const NY = new Date().getFullYear()
  if ((r.nom_complet || '').toUpperCase().includes('NON-DIFFUSIBLE') || r.statut_diffusion === 'P') return null
  const siege = r.siege || {}
  const comp = r.complements || {}
  const dept: string = siege.departement || ''
  const dirs = (r.dirigeants || []).filter((d: any) => d.type_dirigeant === 'personne physique')
  const births: number[] = dirs.filter((d: any) => /^\d+$/.test(d.annee_de_naissance || '')).map((d: any) => parseInt(d.annee_de_naissance, 10))
  const main = dirs[0] || null
  const oldest = births.length ? Math.min(...births) : null
  const successor = oldest && births.length > 1 && NY - oldest >= 55 && Math.max(...births) >= oldest + 20 ? 1 : 0
  const fin = r.finances || {}
  let ca: number | null = null
  let caPrev: number | null = null
  let caYear: number | null = null
  let res: number | null = null
  for (const y of Object.keys(fin).sort().reverse()) {
    if (fin[y]?.ca != null) {
      if (ca === null) { ca = fin[y].ca; caYear = parseInt(y, 10); res = fin[y].resultat_net ?? null }
      else if (caPrev === null) caPrev = fin[y].ca
    }
  }
  const eff: string | null = r.tranche_effectif_salarie || siege.tranche_effectif_salarie || null
  const legalCode = String(r.nature_juridique || '')
  const enseignes: string[] = siege.liste_enseignes || []
  const naf: string = r.activite_principale || ''
  const first = main ? titleCase(String(main.prenoms || '').split(',')[0]) : ''
  return {
    siren: r.siren, siret: siege.siret || null, name: r.nom_complet || r.nom_raison_sociale,
    brand: enseignes[0] || siege.nom_commercial || null,
    legal: LEGAL[legalCode] || `Autre (${legalCode})`, legal_code: legalCode, naf,
    address: siege.adresse || null, cp: siege.code_postal || null, commune: siege.libelle_commune || null,
    dept, zone: ZONES[dept] || 'Hors zone', lat: num(siege.latitude), lon: num(siege.longitude),
    created: r.date_creation || null, eff_code: eff, eff_mid: eff ? EFF_MID[eff] ?? null : null,
    nb_etab: r.nombre_etablissements ?? null, nb_open: r.nombre_etablissements_ouverts ?? null,
    bio: comp.est_bio ? 1 : 0,
    dirigeant: main ? `${first} ${titleCase(main.nom || '')}`.trim() : null,
    dir_first: main ? titleCase(String(main.prenoms || '').split(',')[0].split(' ')[0]) : null,
    dir_birth: oldest, successor, ca, ca_prev: caPrev, ca_year: caYear, resultat: res,
    coop: COOP_CODES.has(legalCode) ? 1 : 0, vinifie: naf.startsWith('11.02') ? 1 : 0,
  }
}

export interface SirenePage {
  rows: IdentityRow[]
  totalPages: number
  totalResults: number
}

/** Une page (25 résultats) de l'API Recherche d'entreprises (data.gouv.fr). */
export async function fetchSirenePage(dept: string, nafs: string, employerOnly: boolean, page: number): Promise<SirenePage> {
  let q = `activite_principale=${encodeURIComponent(nafs)}&departement=${encodeURIComponent(dept)}&etat_administratif=A&per_page=25&page=${page}`
  if (employerOnly) q += `&tranche_effectif_salarie=${EMPLOYER_CODES}`
  let data: any
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      data = await safeJson(`${API}?${q}`, { timeoutMs: 20000 })
      break
    } catch (e: any) {
      if (attempt === 3) throw new Error(`API SIRENE injoignable : ${e.message}`)
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)))
    }
  }
  const rows: IdentityRow[] = []
  for (const r of data.results || []) {
    const l = leadFromSirene(r)
    // l'API filtre sur tous les établissements, pas seulement le siège
    if (l && l.dept === dept) rows.push(l)
  }
  return { rows, totalPages: Math.min(data.total_pages || 1, 400), totalResults: data.total_results || 0 }
}
