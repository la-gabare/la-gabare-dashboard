import 'server-only'
import { NetError, safeFetch, FetchResult } from './net'
import type { AuditResult } from './types'

const NOW_YEAR = () => new Date().getFullYear()

const BUILDERS_LOW: Record<string, RegExp> = {
  wix: /wixstatic|wix\.com|wixsite/, jimdo: /jimdo/, webnode: /webnode/, weebly: /weebly/,
  'e-monsite': /e-monsite/, overblog: /over-blog/, 'google-sites': /sites\.google\.com/,
  godaddy: /godaddy|websitebuilder/, webself: /webself/, ionos: /ionos|1and1|mywebsite/,
  sitew: /sitew\./, yola: /yolasite/, orson: /orson/,
}
const BUILDERS_PRO: Record<string, RegExp> = {
  wordpress: /wp-content|wp-includes|wordpress/, shopify: /cdn\.shopify|shopify/, prestashop: /prestashop/,
  webflow: /webflow/, squarespace: /squarespace/, drupal: /drupal/, joomla: /joomla|\/media\/jui\//,
  woocommerce: /woocommerce/, 'vitisphere/wine': /wineandco|vinistoria|vinoptim|winefunding/,
}
const SOCIAL_PAT: Record<string, RegExp> = {
  instagram: /instagram\.com\/([A-Za-z0-9_.]{2,40})/i,
  facebook: /facebook\.com\/(?!sharer|share|plugins|tr\b|dialog|policies)([A-Za-z0-9_.\-/]{2,80})/i,
  linkedin: /linkedin\.com\/(?:company|in)\/([A-Za-z0-9_\-%]{2,80})/i,
  youtube: /youtube\.com\/(?:@|channel\/|user\/|c\/)([A-Za-z0-9_\-]{2,60})/i,
  tiktok: /tiktok\.com\/@([A-Za-z0-9_.]{2,40})/i,
  x: /(?:twitter|x)\.com\/(?!share|intent)([A-Za-z0-9_]{2,30})/i,
}
const EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g
const PHONE_RE = /(?<!\d)(?:(?:\+|00)33[\s.]?|0)[1-9](?:[\s.\-]?\d{2}){4}(?!\d)/g
const JUNK_MAIL = ['example.', 'sentry', 'wixpress', '.png', '.jpg', '.gif', '.webp', 'u003e', 'domain.', 'email.com', 'votre', 'monsite', 'yourdomain', 'nom@', 'prenom']

export function normalizeUrl(u: string | null | undefined): string {
  const t = (u || '').trim()
  if (!t) return ''
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

export function findContacts(html: string): { emails: string[]; phones: string[] } {
  const emails: string[] = []
  const phones: string[] = []
  for (const m of html.matchAll(/mailto:([^"'?<>\s]+)/gi)) {
    try { emails.push(decodeURIComponent(m[1]).trim()) } catch { emails.push(m[1].trim()) }
  }
  for (const m of html.matchAll(EMAIL_RE)) emails.push(m[0])
  const cleanEmails = emails.map((e) => e.toLowerCase()).filter((e) => !JUNK_MAIL.some((j) => e.includes(j)))
  for (const m of html.matchAll(/tel:([+\d\s.\-()]+)/gi)) phones.push(m[1].replace(/[^\d+]/g, ''))
  for (const m of html.matchAll(PHONE_RE)) phones.push(m[0].replace(/[^\d+]/g, ''))
  return { emails: [...new Set(cleanEmails)], phones: [...new Set(phones)] }
}

export function fmtPhone(p: string): string {
  const q = p.replace(/^(\+33|0033)/, '0')
  return q.length === 10 ? q.match(/.{2}/g)!.join(' ') : q
}

interface FetchInfo { ssl_invalid: boolean; tried: string[]; blocked?: number }

async function fetchSite(url: string): Promise<{ resp: FetchResult | null; info: FetchInfo }> {
  const info: FetchInfo = { ssl_invalid: false, tried: [] }
  const u = new URL(normalizeUrl(url))
  const candidates = [u.toString()]
  if (u.protocol === 'https:') candidates.push(`http://${u.host}${u.pathname || '/'}`)
  for (const cand of candidates) {
    try {
      const r = await safeFetch(cand, { timeoutMs: 12000 })
      if (r.status >= 400) {
        info.tried.push(`${cand} -> HTTP ${r.status}`)
        if ([403, 429, 503].includes(r.status)) { info.blocked = r.status; return { resp: null, info } }
        continue
      }
      if (cand.startsWith('http://') && u.protocol === 'https:') info.ssl_invalid = info.tried.some((t) => t.includes('CERT'))
      return { resp: r, info }
    } catch (e) {
      const err = e as NetError
      info.tried.push(`${cand} -> ${err.code}`)
      if (err.code === 'PRIVATE' || err.code === 'BADURL') return { resp: null, info }
    }
  }
  return { resp: null, info }
}

export function analyseHtml(resp: FetchResult): AuditResult {
  const html = resp.text
  const low = html.toLowerCase()
  const final = resp.url
  const A: AuditResult = {
    final_url: final, https: final.toLowerCase().startsWith('https://'), http_status: resp.status,
    load_s: Math.round(resp.elapsed * 100) / 100, size_kb: Math.round(resp.size / 1024),
  }
  const gen = /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i.exec(html)
  A.generator = gen ? gen[1].slice(0, 80) : null
  let cms: string | null = null
  let tier: 'low' | 'pro' | null = null
  for (const [k, re] of Object.entries(BUILDERS_LOW)) if (re.test(low)) { cms = k; tier = 'low'; break }
  if (!cms) for (const [k, re] of Object.entries(BUILDERS_PRO)) if (re.test(low)) { cms = k; tier = 'pro'; break }
  A.cms = cms
  A.cms_tier = tier
  A.viewport = /<meta[^>]+name=["']viewport/.test(low)
  A.doctype_html5 = /^\s*<!doctype html>/.test(low.slice(0, 200))
  const legacy: string[] = []
  for (const [re, label] of [
    [/<frameset/, 'frames'], [/<font[\s>]/, 'balises <font>'], [/<marquee/, 'marquee'], [/<center>/, '<center>'],
    [/swfobject|\.swf["']/, 'Flash'], [/<blink/, 'blink'],
  ] as [RegExp, string][]) if (re.test(low)) legacy.push(label)
  const count = (s: string) => low.split(s).length - 1
  if (count('<table') >= 8 && count('<div') < 20) legacy.push('mise en page en tableaux')
  A.legacy = legacy
  const jq = [...low.matchAll(/jquery[-.\w/]*?[-.](\d+)\.(\d+)(?:\.(\d+))?(?:\.min)?\.js/g)]
  A.jquery_old = jq.some((m) => parseInt(m[1], 10) < 3)
  const years = [...low.matchAll(/(?:©|&copy;|&#169;|copyright)[^0-9<]{0,25}(?:(?:19|20)\d\d\s*[-–—/]\s*)?((?:19|20)\d\d)/g)]
    .map((m) => parseInt(m[1], 10)).filter((y) => y >= 1995 && y <= NOW_YEAR() + 1)
  A.copyright_year = years.length ? Math.max(...years) : null
  A.last_modified = resp.headers['last-modified'] || null
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  A.title = t ? t[1].replace(/\s+/g, ' ').trim().slice(0, 140) : ''
  A.meta_desc = !!(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,})/i.exec(html) ||
    /<meta[^>]+content=["']([^"']{10,})["'][^>]+name=["']description/i.exec(html))
  A.og = low.includes('og:image')
  A.schema_org = /application\/ld\+json/.test(low) && /winery|localbusiness|organization|store/.test(low)
  A.lang_en = /hreflang=["']en|\/en\/|lang=en|href=["'][^"']*[?&]lang=en|english/.test(low)
  A.shop = /panier|add[- ]to[- ]cart|ajouter au panier|woocommerce|boutique en ligne|e-shop|eshop|\/boutique|\/shop|commander en ligne|cart\b/.test(low)
  A.age_gate = /avez-vous plus de 18|plus de 18 ans|majeur|âge légal|age[- ]gate|age[- ]verification|vérification de l.âge|j.ai plus de 18|i am over 18|18 ans ou plus/.test(low)
  A.sanitary = /abus d.alcool|consommer avec modération|consommer avec moderation|alcool est dangereux|femmes enceintes|santepubliquefrance|pratiquez la modération|l.abus d/.test(low)
  A.tourism = /œnotourisme|oenotourisme|dégustation|degustation|visite (?:de|du|à|a)|caveau|accueil (?:au|à) la propriété|chambres? d.hôtes|gîte/.test(low)
  A.booking = /réserv|reserv|book(?:ing)?\b|bokun|regiondo|fareharbor|weezevent|zenchef/.test(low)
  A.blog = /href=["'][^"']*(?:\/blog|actualit|\/news|\/actus|\/journal|\/articles)/.test(low)
  A.form = low.includes('<form')
  const soc: Record<string, string> = {}
  for (const [k, re] of Object.entries(SOCIAL_PAT)) {
    const m = re.exec(html)
    if (m) soc[k] = m[0]
  }
  A.socials = soc
  return A
}

export function obsolescence(A: AuditResult): { score: number; issues: string[]; goods: string[] } {
  let s = 0
  const issues: string[] = []
  const goods: string[] = []
  const bad = (pts: number, txt: string) => { s += pts; issues.push(txt) }
  if (!A.https) bad(22, 'Pas de HTTPS (navigateurs « Non sécurisé »)')
  if (A.ssl_invalid) bad(14, 'Certificat SSL invalide ou expiré')
  if (!A.viewport) bad(24, 'Non adapté au mobile (pas de balise viewport)')
  else goods.push('Adapté au mobile')
  if (A.legacy?.length) bad(16, `Code ancien : ${A.legacy.join(', ')}`)
  if (!A.doctype_html5 && !A.legacy?.length) bad(8, 'Doctype pré-HTML5')
  if (A.jquery_old) bad(6, 'jQuery 1.x / 2.x obsolète')
  const cy = A.copyright_year
  if (cy) {
    const age = NOW_YEAR() - cy
    if (age >= 5) bad(22, `Copyright ${cy} : site non mis à jour depuis ${age} ans`)
    else if (age >= 3) bad(13, `Copyright ${cy} : site peu mis à jour`)
    else if (age <= 1) goods.push(`Mentions à jour (${cy})`)
  }
  if (A.cms_tier === 'low') bad(9, `Constructeur d'entrée de gamme (${A.cms})`)
  if (!A.meta_desc) bad(7, 'Pas de meta description (SEO)')
  if ((A.title || '').length < 12) bad(5, 'Balise title absente ou trop courte')
  if (!A.og) bad(3, "Pas d'aperçu de partage (Open Graph)")
  if ((A.load_s || 0) > 3.5) bad(6, `Chargement lent (${(A.load_s as number).toFixed(1)} s)`)
  else if ((A.load_s || 0) < 1.5) goods.push('Chargement rapide')
  return { score: Math.min(100, s), issues, goods }
}

export interface AuditOutcome {
  site_status: 'inconnu' | 'hs' | 'obsolete' | 'vieillissant' | 'moderne'
  audit: AuditResult
  email: string | null
  phone: string | null
  socials: Record<string, string>
}

export async function auditUrl(url: string): Promise<AuditOutcome> {
  const { resp, info } = await fetchSite(url)
  if (!resp) {
    if (info.blocked) {
      return {
        site_status: 'inconnu', email: null, phone: null, socials: {},
        audit: { error: `Le site bloque les robots (HTTP ${info.blocked}) — à vérifier à la main.`, tried: info.tried },
      }
    }
    return { site_status: 'hs', email: null, phone: null, socials: {}, audit: { error: 'Site injoignable', tried: info.tried } }
  }
  const A = analyseHtml(resp)
  A.ssl_invalid = info.ssl_invalid
  let { emails, phones } = findContacts(resp.text)
  // page contact (une seule requête supplémentaire)
  try {
    const m = /href=["']([^"']*contact[^"']*)["']/i.exec(resp.text)
    if (m && (!emails.length || !phones.length)) {
      const c = await safeFetch(new URL(m[1], resp.url).toString(), { timeoutMs: 8000, maxBytes: 300_000 })
      const f = findContacts(c.text)
      emails = [...new Set([...emails, ...f.emails])]
      phones = [...new Set([...phones, ...f.phones])]
    }
  } catch { /* contact facultatif */ }
  const host = new URL(resp.url).host.toLowerCase().replace('www.', '')
  const root = host.split('.')[0]
  emails.sort((a, b) => Number(!a.includes(root)) - Number(!b.includes(root)))
  const { score, issues, goods } = obsolescence(A)
  A.obsolescence = score
  A.issues = issues
  A.goods = goods
  const site_status = score >= 45 ? 'obsolete' : score >= 25 ? 'vieillissant' : 'moderne'
  return { site_status, audit: A, email: emails[0] || null, phone: phones[0] ? fmtPhone(phones[0]) : null, socials: A.socials || {} }
}

/** PageSpeed Insights mobile (API Google publique, quota limité sans clé). */
export async function runPsi(url: string): Promise<NonNullable<AuditResult['psi']>> {
  const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?strategy=mobile&category=performance&url=${encodeURIComponent(normalizeUrl(url))}`
  const r = await safeFetch(api, { timeoutMs: 55000, accept: 'application/json', maxBytes: 5_000_000 })
  if (r.status >= 400) throw new Error(`PageSpeed HTTP ${r.status}`)
  const d = JSON.parse(r.text)
  const lh = d.lighthouseResult || {}
  const perf = lh.categories?.performance?.score
  const au = lh.audits || {}
  return {
    perf: perf != null ? Math.round(perf * 100) : null,
    lcp: au['largest-contentful-paint']?.displayValue, cls: au['cumulative-layout-shift']?.displayValue,
    tbt: au['total-blocking-time']?.displayValue,
  }
}
