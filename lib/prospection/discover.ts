import 'server-only'
import dns from 'node:dns/promises'
import { safeFetch, safeJson, stripAcc } from './net'
import { normalizeUrl } from './audit'
import type { Gbp, Prospect, Settings } from './types'

const PARKING_HOSTS = ['nicsell', 'sedo.', 'dan.com', 'afternic', 'hugedomains', 'godaddy', 'ovh.', 'ionos', 'parking', 'sav.com',
  'undeveloped', 'bodis', 'above.com', 'namecheap', 'gandi.net', 'registrar']
const STOP_TOKENS = new Set(['domaine', 'domaines', 'chateau', 'château', 'clos', 'cave', 'caves', 'earl', 'scea', 'sarl', 'gaec',
  'sas', 'sasu', 'eurl', 'vignoble', 'vignobles', 'viticole', 'exploitation', 'les', 'des', 'de', 'du', 'la', 'le', 'et', 'famille',
  'vins', 'vin', 'ets', 'sci', 'gfa', 'monsieur', 'madame', 'mme', 'fils', 'pere', 'and', 'cie', 'societe', 'agricole', 'gaecs',
  'viti', 'vigneron', 'vignerons', 'sa', 'sca'])
const SKIP_WORDS = new Set(['scea', 'earl', 'sarl', 'sas', 'sasu', 'eurl', 'gaec', 'sci', 'gfa', 'ets', 'la', 'le', 'les', 'de', 'du', 'des', 'et', 'l', 'd'])
const WINE_RE = /\bvins?\b|vigneron|domaine|vignoble|cuvee|millesime|appellation/

export function nameTokens(...names: (string | null | undefined)[]): string[] {
  const toks: string[] = []
  for (const n of names) {
    for (const w of stripAcc(n || '').toLowerCase().split(/[^a-z0-9]+/)) {
      if (w.length >= 3 && !STOP_TOKENS.has(w) && !/^\d+$/.test(w)) toks.push(w)
    }
  }
  return [...new Set(toks)]
}

/** Noms de domaine plausibles (domaine-xxx.fr, chateau-xxx.com…). */
export function guessDomains(nameMain: string | null | undefined, nameAlt: string | null | undefined, toks: string[]): string[] {
  const partsSets: string[][] = []
  for (const n of [nameMain, nameAlt]) {
    const w = stripAcc((n || '').replace(/\(.*?\)/g, ' ')).toLowerCase().split(/[^a-z0-9]+/).filter((x) => x && !SKIP_WORDS.has(x))
    if (w.length) partsSets.push(w)
  }
  const cores: string[][] = []
  for (const w of partsSets) {
    const core = w.filter((x) => !STOP_TOKENS.has(x))
    if (core.length && core.length <= 4) cores.push(core)
  }
  for (const t of toks.slice(0, 2)) if (t.length >= 4) cores.push([t])
  const out: string[] = []
  for (const core of cores) {
    for (const j of ['', '-']) {
      const c = core.join(j)
      for (const pre of ['', `domaine${j}`, `chateau${j}`, `clos${j}`, `vignoble${j}`, `domaines${j}`, `cave${j}`, `vins${j}`]) out.push(pre + c)
      out.push(`${c}${j}vins`)
      out.push(`${c}${j}vigneron`)
    }
  }
  return [...new Set(out)].filter((s) => s.length >= 4 && s.length <= 40).slice(0, 22)
}

async function resolves(host: string): Promise<boolean> {
  try {
    await Promise.race([dns.lookup(host), new Promise((_, rej) => setTimeout(() => rej(new Error('t')), 3000))])
    return true
  } catch {
    return false
  }
}

export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const p = rad(bLat - aLat)
  const l = rad(bLon - aLon)
  const h = Math.sin(p / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(l / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

/** Google Places via Serper.dev (optionnel) : site de la fiche, note, avis, téléphone. */
async function serperLookup(row: Prospect, key: string): Promise<Gbp | null> {
  try {
    const d = await safeJson<any>('https://google.serper.dev/places', {
      method: 'POST', timeoutMs: 20000,
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${row.brand || row.name} ${row.commune || ''}`, gl: 'fr', hl: 'fr' }),
    })
    const toks = nameTokens(row.brand, row.name).filter((t) => t.length >= 4)
    for (const p of d.places || []) {
      const title = stripAcc(p.title || '').toLowerCase()
      if (toks.length && toks.some((t) => title.includes(t))) {
        return { found: true, website: p.website, rating: p.rating, reviews: p.ratingCount, phone: p.phoneNumber, title: p.title }
      }
    }
    return { found: false }
  } catch {
    return null
  }
}

/** Site référencé sur OpenStreetMap à moins de 8 km dont le nom correspond (requête locale, une seule). */
async function osmWebsite(row: Prospect, toks: string[]): Promise<string | null> {
  if (row.lat == null || row.lon == null || !toks.length) return null
  const q = `[out:json][timeout:20];(nwr(around:8000,${row.lat},${row.lon})["name"]["website"];nwr(around:8000,${row.lat},${row.lon})["name"]["contact:website"];);out tags center 150;`
  let data: any
  try {
    data = await safeJson('https://overpass-api.de/api/interpreter', {
      // Overpass refuse (406) les User-Agent de navigateur : il demande un identifiant d'application
      method: 'POST', timeoutMs: 25000, body: `data=${encodeURIComponent(q)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'GabareProspect/1.0', Accept: '*/*' },
    })
  } catch {
    return null
  }
  const tokset = new Set(toks)
  let best: { d: number; w: string } | null = null
  for (const e of data.elements || []) {
    const t = e.tags || {}
    const c = e.center || { lat: e.lat, lon: e.lon }
    const w = t.website || t['contact:website']
    if (!w || !t.name || c.lat == null) continue
    const etoks = nameTokens(t.name)
    const nm = stripAcc(t.name).toLowerCase()
    // tous les mots significatifs du nom OSM doivent figurer dans le nom de l'entreprise (« Baudry-Dutour » ≠ « Bernard Baudry »)
    if (etoks.length && etoks.every((x) => tokset.has(x)) && toks.some((x) => x.length >= 4 && nm.includes(x))) {
      const d = haversineKm(row.lat, row.lon, c.lat, c.lon)
      if (d <= 8 && (!best || d < best.d)) best = { d, w }
    }
  }
  return best ? best.w : null
}

export interface DiscoverResult {
  status: 'found' | 'none'
  url: string | null
  verified: number
  gbp: Gbp | null
  gbp_confirms_none: boolean
}

async function verifyCandidate(c: string, row: Prospect, toks: string[]): Promise<string | null> {
  let host: string
  try { host = new URL(c).host.toLowerCase() } catch { return null }
  let r
  try {
    r = await safeFetch(c, { timeoutMs: 9000, maxBytes: 250_000 })
  } catch {
    return null
  }
  if (r.status >= 400) return null
  const fh = new URL(r.url).host.toLowerCase().replace('www.', '')
  if (PARKING_HOSTS.some((b) => fh.includes(b)) || fh.split('.').slice(-2).join('.') !== host.replace('www.', '').split('.').slice(-2).join('.')) return null
  const txt = stripAcc(r.text.slice(0, 250_000)).toLowerCase()
  const title = /<title[^>]*>([\s\S]*?)<\/title>/.exec(txt)?.[1] || ''
  const hitHost = toks.filter((t) => stripAcc(host).includes(t))
  const hitTxt = toks.filter((t) => title.includes(t) || txt.slice(0, 20000).includes(t))
  const wine = WINE_RE.test(txt)
  const communeOk = row.commune ? txt.includes(stripAcc(row.commune).toLowerCase()) : false
  const cpOk = !!row.cp && txt.includes(row.cp)
  if (toks.length && wine && (hitHost.length || (hitTxt.length >= Math.max(1, Math.min(2, toks.length)) && communeOk))) {
    // sans commune/CP sur la page, risque d'homonyme (autre région) : on rejette
    if (communeOk || cpOk) return r.url
  }
  return null
}

export async function discoverSite(row: Prospect, settings: Settings): Promise<DiscoverResult> {
  const base = (row.brand || row.name || '').replace(/\(.*?\)/g, ' ')
  const toks = nameTokens(base, row.name)
  let gbp: Gbp | null = null
  if (settings.serper_key) {
    gbp = await serperLookup(row, settings.serper_key)
    if (gbp?.website) return { status: 'found', url: normalizeUrl(gbp.website), verified: 1, gbp, gbp_confirms_none: false }
  }
  const slugs = guessDomains(row.brand, row.name, toks)
  const hosts = slugs.flatMap((s) => [`${s}.fr`, `${s}.com`])
  const ok = await Promise.all(hosts.map(resolves))
  const cands = hosts.filter((_, i) => ok[i]).slice(0, 6).map((h) => `https://${h}/`)
  const verified = await Promise.all(cands.map((c) => verifyCandidate(c, row, toks)))
  const hit = verified.find(Boolean)
  if (hit) return { status: 'found', url: hit, verified: 1, gbp, gbp_confirms_none: false }
  const osm = await osmWebsite(row, toks)
  if (osm) {
    const u = normalizeUrl(osm)
    try {
      const r = await safeFetch(u, { timeoutMs: 10000, maxBytes: 120_000 })
      if (r.status < 400 && WINE_RE.test(stripAcc(r.text).toLowerCase())) return { status: 'found', url: r.url, verified: 1, gbp, gbp_confirms_none: false }
    } catch {
      return { status: 'found', url: u, verified: 1, gbp, gbp_confirms_none: false }
    }
  }
  return { status: 'none', url: null, verified: 0, gbp, gbp_confirms_none: !!(gbp && gbp.found && !gbp.website) }
}
