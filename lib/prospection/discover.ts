import 'server-only'
import dns from 'node:dns/promises'
import { NetError, safeFetch, safeJson, stripAcc } from './net'
import { normalizeUrl } from './audit'
import type { Gbp, Prospect, Settings } from './types'

const PARKING_HOSTS = ['nicsell', 'sedo.', 'dan.com', 'afternic', 'hugedomains', 'godaddy', 'ovh.', 'ionos', 'parking', 'sav.com',
  'undeveloped', 'bodis', 'above.com', 'namecheap', 'gandi.net', 'registrar']
const STOP_TOKENS = new Set(['domaine', 'domaines', 'chateau', 'château', 'clos', 'cave', 'caves', 'earl', 'scea', 'sarl', 'gaec',
  'sas', 'sasu', 'eurl', 'vignoble', 'vignobles', 'viticole', 'exploitation', 'les', 'des', 'de', 'du', 'la', 'le', 'et', 'famille',
  'vins', 'vin', 'ets', 'sci', 'gfa', 'monsieur', 'madame', 'mme', 'fils', 'pere', 'and', 'cie', 'societe', 'agricole', 'gaecs',
  'viti', 'vigneron', 'vignerons', 'sa', 'sca'])
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

const LEGAL_WORDS = new Set(['scea', 'earl', 'sarl', 'sas', 'sasu', 'eurl', 'gaec', 'sci', 'gfa', 'ets', 'sa', 'sca', 'scev', 'snc', 'ei',
  'societe', 'civile', 'exploitation', 'agricole', 'abreviation', 'groupement', 'foncier', 'viticole'])
const PARTICLES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'et', 'en', 'sur', 'aux', 'au'])
const PREFIX_WORDS = ['domaine', 'domaines', 'chateau', 'clos', 'vignoble', 'vignobles', 'cave', 'caves', 'maison', 'manoir', 'vins', 'famille']
const FAMILY_WORDS = new Set(['pere', 'fils', 'freres', 'frere', 'et', 'famille'])
const ARTICLES = new Set(['la', 'le', 'les', 'l'])

// Mots de l'appellation / du terroir : filet de sécurité quand la commune n'apparaît pas sur le site
const APPEL: Record<string, RegExp> = {
  '44': /muscadet|gros[ -]plant|coteaux d.ancenis|pays nantais|fiefs vend|loire-atlantique|clisson|vallet/,
  '49': /anjou|saumur|layon|savenni|aubance|bonnezeaux|quarts? de chaume|maine-et-loire|champigny|coteaux du loir/,
  '37': /touraine|vouvray|chinon|bourgueil|montlouis|indre-et-loire|jasni/,
  '41': /touraine|cheverny|cour-cheverny|valen[cç]ay|loir-et-cher|coteaux du vend/,
  '18': /sancerre|menetou|quincy|reuilly|pouilly|centre-loire|cher\b/,
  '36': /reuilly|valen[cç]ay|centre-loire|indre\b/,
  '45': /orl[eé]ans|giennois|loiret|centre-loire|cl[eé]ry/,
  '58': /pouilly|giennois|nievre|centre-loire|coteaux du giennois/,
}
const APPEL_DEFAULT = /val de loire|vignobles? de loire|vin de loire/

/** Noms de domaine plausibles (domaine-des-xxx.fr, lahautexxx.com, chateau-xxx.fr…) à partir du nom légal / de l'enseigne. */
export function guessDomains(nameMain: string | null | undefined, nameAlt: string | null | undefined, commune?: string | null): string[] {
  const variants: string[][] = []
  const seen = new Set<string>()
  const add = (w: string[]) => {
    const k = w.join(' ')
    if (w.length && w.length <= 7 && !seen.has(k)) { seen.add(k); variants.push(w) }
  }
  for (const n of [nameMain, nameAlt]) {
    if (!n) continue
    const clean = stripAcc(n.replace(/\(.*?\)/g, ' ')).toLowerCase().replace(/ et par abreviation.*$/, '')
    const words = clean.split(/[^a-z0-9]+/).filter((x) => x && !LEGAL_WORDS.has(x))
    const noPart = words.filter((x) => !PARTICLES.has(x))
    const core = noPart.filter((x) => !PREFIX_WORDS.includes(x))
    const noFamily = noPart.filter((x) => !FAMILY_WORDS.has(x))
    add(words); add(noPart); add(core); add(noFamily)
    add(noFamily.filter((x) => !PREFIX_WORDS.includes(x)))
    // « EARL LA PEPIERE » -> domaine-de-la-pepiere ; « DES HERBAUGES » -> domaine-des-herbauges
    if (words.length && !PREFIX_WORDS.includes(words[0])) {
      if (ARTICLES.has(words[0])) { add(['domaine', 'de', ...words]); add(['chateau', 'de', ...words]) }
      if (words[0] === 'des' || words[0] === 'du') { add(['domaine', ...words]); add(['chateau', ...words]) }
    }
    // nom/prénom inversés : « PICHON CLAUDE MICHEL » -> claude-michel-pichon
    const perm = (a: string[]): string[][] => (a.length <= 1 ? [a] : a.flatMap((x, i) => perm([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r])))
    if (core.length >= 2 && core.length <= 3) perm(core).forEach(add)
    // « LA TAILLE AUX LOUPS » -> tailleauxloups (sans l'article initial)
    if (words.length >= 2 && ARTICLES.has(words[0])) add(words.slice(1))
    // « PIERRE ET BERTRAND COULY » -> pb-couly (initiales des prénoms + nom)
    if (noFamily.length >= 3 && noFamily.length <= 4) add([noFamily.slice(0, -1).map((x) => x[0]).join(''), noFamily[noFamily.length - 1]])
    // sous-ensembles contigus : « PIERRE LUNEAU PAPIN » -> luneau-papin ; « JEAN MONNIER » -> monnier
    if (core.length >= 2 && core.length <= 4) {
      for (let i = 0; i < core.length; i++) for (let j = i + 1; j <= core.length; j++) {
        const sub = core.slice(i, j)
        if (sub.length < core.length && sub.join('').length >= 5) add(sub)
      }
    }
  }
  const out: string[] = []
  const push = (s: string) => { if (s.length >= 4 && s.length <= 45 && !out.includes(s)) out.push(s) }
  for (const v of variants) {
    const startsWithPrefix = PREFIX_WORDS.includes(v[0])
    for (const j of ['-', '']) {
      const base = v.join(j)
      push(base)
      if (!startsWithPrefix) for (const pre of ['domaine', 'chateau', 'clos', 'vignoble', 'cave']) push(pre + j + base)
      push(`${base}${j}vins`)
    }
  }
  // « coulydutheil-chinon » : nom + commune (très courant en Touraine)
  const cs = stripAcc(commune || '').toLowerCase().replace(/(saint|sainte)/g, 'st').split(/[^a-z0-9]+/).filter((x) => x && !PARTICLES.has(x))
  if (cs.length && cs.join('').length <= 14) {
    for (const v of variants.slice(0, 3)) {
      push(`${v.join('')}-${cs.join('-')}`); push(`${v.join('-')}-${cs.join('-')}`); push(`${v.join('')}${cs.join('')}`)
    }
  }
  return out.slice(0, 140)
}

// dns.lookup passe par le pool de 4 fils de libuv : des centaines de requêtes s'y bloquent (faux « introuvable »).
// Resolver (c-ares) est entièrement asynchrone et supporte des centaines de requêtes simultanées.
const resolver = new dns.Resolver({ timeout: 2500, tries: 2 })

async function resolves(host: string): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return (await resolver.resolve4(host)).length > 0
    } catch (e: any) {
      if (e?.code === 'ENOTFOUND' || e?.code === 'ENODATA') return false // le domaine n'existe pas
      // délai / erreur transitoire : on retente une fois
    }
  }
  return false
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

interface Candidate { url: string; verified: number }

const norm = (t: string) => stripAcc(t).toLowerCase()

async function verifyCandidate(c: string, row: Prospect, toks: string[]): Promise<Candidate | null> {
  let host: string
  try { host = new URL(c).host.toLowerCase() } catch { return null }
  let r
  try {
    r = await safeFetch(c, { timeoutMs: 12000, maxBytes: 250_000 })
  } catch (e) {
    // Le domaine existe (DNS) mais le serveur ne répond pas : si TOUS les mots du nom figurent dans l'adresse,
    // c'est très probablement le site du domaine, actuellement en panne (opportunité « site HS »).
    const code = (e as NetError).code
    const hostN0 = norm(host).replace(/[^a-z0-9]/g, '')
    if (!['ENOTFOUND', 'PRIVATE', 'BADURL', 'CERT', 'REDIRECTS'].includes(code) && toks.length >= 1 &&
        toks.every((t) => hostN0.includes(t)) && (toks.length >= 2 || toks[0].length >= 7)) return { url: c, verified: 0 }
    return null
  }
  if (r.status >= 400) return null
  const fh = new URL(r.url).host.toLowerCase().replace('www.', '')
  if (PARKING_HOSTS.some((b) => fh.includes(b)) || fh.split('.').slice(-2).join('.') !== host.replace('www.', '').split('.').slice(-2).join('.')) return null
  const txt = norm(r.text.slice(0, 250_000))
  if (!WINE_RE.test(txt)) return null
  const title = /<title[^>]*>([\s\S]*?)<\/title>/.exec(txt)?.[1] || ''
  const hostN = norm(host).replace(/[^a-z0-9]/g, '')
  const hitHost = toks.filter((t) => hostN.includes(t))
  const hitTxt = toks.filter((t) => title.includes(t) || txt.slice(0, 20000).includes(t))
  const strongHost = hitHost.length >= Math.min(2, toks.length) && hitHost.length > 0
  if (!(hitHost.length || (hitTxt.length >= Math.max(1, Math.min(2, toks.length))))) return null
  const commune = row.commune ? norm(row.commune) : ''
  const located = (t: string) => (!!commune && t.includes(commune)) || (!!row.cp && t.includes(row.cp))
  if (located(txt)) return { url: r.url, verified: 1 }
  // la commune/le code postal figurent souvent sur la page contact ou les mentions légales
  const links = [...r.text.matchAll(/href=["']([^"'#]*(?:contact|mention|acces|nous-trouver|ou-nous)[^"'#]*)["']/gi)].map((m) => m[1]).slice(0, 2)
  for (const l of links) {
    try {
      const p = await safeFetch(new URL(l, r.url).toString(), { timeoutMs: 6000, maxBytes: 200_000 })
      if (p.status < 400 && located(norm(p.text))) return { url: r.url, verified: 1 }
    } catch { /* page facultative */ }
  }
  // filet de sécurité : mots du terroir (muscadet, anjou…) + nom du domaine dans l'adresse du site → à vérifier par l'utilisateur
  if (strongHost && (APPEL[row.dept] || APPEL_DEFAULT).test(txt)) return { url: r.url, verified: 0 }
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
  const slugs = guessDomains(row.brand, row.name, row.commune)
  const hosts = slugs.flatMap((s) => [`${s}.fr`, `${s}.com`])
  const ok: boolean[] = []
  for (let i = 0; i < hosts.length; i += 60) ok.push(...(await Promise.all(hosts.slice(i, i + 60).map(resolves))))
  const resolved = hosts.filter((_, i) => ok[i]).slice(0, 8)
  const results = await Promise.all(resolved.map((h) => verifyCandidate(`https://${h}/`, row, toks)))
  // meilleur candidat : d'abord les sites localisés (verified = 1), dans l'ordre de pertinence des noms
  const hit = results.find((x) => x && x.verified === 1) || results.find(Boolean)
  if (hit) return { status: 'found', url: hit.url, verified: hit.verified, gbp, gbp_confirms_none: false }
  const osm = await osmWebsite(row, toks)
  if (osm) {
    const u = normalizeUrl(osm)
    try {
      const r = await safeFetch(u, { timeoutMs: 10000, maxBytes: 120_000 })
      if (r.status < 400 && WINE_RE.test(norm(r.text))) return { status: 'found', url: r.url, verified: 1, gbp, gbp_confirms_none: false }
    } catch {
      return { status: 'found', url: u, verified: 1, gbp, gbp_confirms_none: false }
    }
  }
  return { status: 'none', url: null, verified: 0, gbp, gbp_confirms_none: !!(gbp && gbp.found && !gbp.website) }
}
