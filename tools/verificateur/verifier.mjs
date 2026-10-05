// Vérificateur de sites — gratuit, tourne sur VOTRE ordinateur.
// Pour chaque domaine viticole, cherche sur Bing (vrai navigateur Edge/Chrome, rythme humain), vérifie chaque site candidat
// (commune / code postal / nom sur la page) puis enregistre le résultat dans l'admin.
//
//   node verifier.mjs --dept=37                 (tous les domaines du 37 non encore vérifiés)
//   node verifier.mjs --dept=37 --limit=50      (50 premiers, par priorité)
//   node verifier.mjs --dept=37,49 --no-confirm (ne marque jamais « sans site vérifié »)
//
// Variables : PROSPECTION_PASSWORD (sinon demandé), PROSPECTION_USER (défaut admin), ADMIN_URL (défaut https://admin.la-gabare.fr)
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import readline from 'node:readline'

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true] }))
const ADMIN = String(args.admin || process.env.ADMIN_URL || 'https://admin.la-gabare.fr').replace(/\/$/, '')
const USER = process.env.PROSPECTION_USER || 'admin'
const DEPTS = String(args.dept || '37')
const LIMIT = parseInt(args.limit || '1000', 10)
const CONFIRM_NONE = !args['no-confirm']
const DEBUG = !!args.debug
const WORKERS = Math.max(1, Math.min(4, parseInt(args.workers || '3', 10)))
const FAST = args.slow ? 1 : 0.35 // facteur sur les pauses (défaut : rapide)
const dbg = (...a) => { if (DEBUG) console.log('   ·', ...a) }
const BROWSER = String(args.browser || 'msedge') // msedge | chrome
const STATE_FILE = new URL('./verificateur-etat.json', import.meta.url)
const REPORT_FILE = new URL('./rapport-verification.csv', import.meta.url)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const stripAcc = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
const log = (...a) => console.log(new Date().toLocaleTimeString('fr-FR'), ...a)

// ---------------------------------------------------------------- mot de passe
async function askPassword() {
  if (process.env.PROSPECTION_PASSWORD) return process.env.PROSPECTION_PASSWORD
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  rl._writeToOutput = (s) => { if (s.includes('\n') || s.includes('Mot de passe')) process.stdout.write(s) }
  return new Promise((res) => rl.question('Mot de passe du module Prospection : ', (a) => { rl.close(); console.log(); res(a.trim()) }))
}
const PASS = await askPassword()
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64')

async function api(path, body) {
  const r = await fetch(`${ADMIN}/api/prospection${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: AUTH, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  })
  if (r.status === 401) throw new Error('Mot de passe refusé (401)')
  return r.json()
}

// ---------------------------------------------------------------- noms
const STOP = new Set(['domaine', 'domaines', 'chateau', 'clos', 'cave', 'caves', 'earl', 'scea', 'sarl', 'sas', 'sasu', 'eurl', 'gaec', 'sca', 'scev', 'sci', 'gfa',
  'vignoble', 'vignobles', 'viticole', 'exploitation', 'les', 'des', 'de', 'du', 'la', 'le', 'et', 'famille', 'vins', 'vin', 'ets', 'societe', 'civile', 'agricole',
  'pere', 'fils', 'freres', 'groupe', 'maison', 'manoir', 'abreviation', 'par', 'sur', 'en', 'aux', 'au'])
function nameTokens(...names) {
  const t = []
  for (const n of names) for (const w of stripAcc(String(n || '').replace(/\(.*?\)/g, ' ')).toLowerCase().split(/[^a-z0-9]+/)) if (w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w)) t.push(w)
  return [...new Set(t)]
}
const cleanLabel = (s) => String(s || '').replace(/\(.*?\)/g, ' ').replace(/\b(SCEA|EARL|SARL|SAS|SASU|EURL|GAEC|SCA|SCEV|SCI|GFA|ETS)\b/gi, ' ').replace(/ ET PAR ABREVIATION.*$/i, '').replace(/\s+/g, ' ').trim()

const BLOCK = ['bing.', 'microsoft', 'google.', 'facebook.', 'instagram.', 'linkedin.', 'youtube.', 'twitter.', 'x.com', 'tiktok.', 'pinterest.', 'wikipedia.', 'amazon.', 'leboncoin.',
  'pagesjaunes.', 'societe.com', 'pappers.', 'infogreffe.', 'verif.com', 'tripadvisor.', 'booking.', 'airbnb.', 'hachette-vins.', 'vivino.', 'wine-searcher.', 'idealwine.', 'vinatis.',
  'lefigaro.', 'larvf.', 'petitfute.', 'thewinedoctor.', 'decanter.', 'lapassionduvin.', 'annuaire', 'mappy.', 'cylex.', 'kompass.', 'europages.', 'infobel.', '118712.', 'inao.',
  'vinsdeloire.', 'ouest-france.', 'lanouvellerepublique.', 'francebleu.', 'wine.com', 'uvinum.', 'twil.', 'cavissima.', 'vinexpo.', 'wine-paris.', 'data.gouv.', 'gouv.fr', 'dnb.com']
const PARKING = ['nicsell', 'sedo.', 'dan.com', 'afternic', 'hugedomains', 'godaddy', 'ovh.', 'ionos', 'parking', 'bodis', 'namecheap', 'above.com']
const WINE = /\bvins?\b|vigneron|domaine|vignoble|cuvee|millesime|appellation/
const APPEL = /muscadet|gros[ -]plant|anjou|saumur|layon|savenni|touraine|vouvray|chinon|bourgueil|montlouis|cheverny|sancerre|menetou|quincy|reuilly|pouilly|giennois|valen[cç]ay|val de loire|loire/

// ---------------------------------------------------------------- recherche Bing (vrai navigateur)
function decodeBing(h) {
  try {
    const u = new URL(h)
    if (u.hostname.endsWith('bing.com') && u.pathname.startsWith('/ck/a')) {
      let v = u.searchParams.get('u') || ''
      if (v.startsWith('a1')) v = v.slice(2)
      return Buffer.from(v.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    }
  } catch { /* ignore */ }
  return h
}

let browser
const pages = []
async function openBrowser() {
  browser = await chromium.launch({ channel: BROWSER, headless: false, args: ['--disable-blink-features=AutomationControlled', '--window-size=1100,750'] })
  for (let i = 0; i < WORKERS; i++) {
    const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1100, height: 700 } })
    pages.push(await ctx.newPage())
  }
}

let consecutiveEmpty = 0, pauses = 0
/** Retourne { urls: string[], ok: boolean } — ok=false si la recherche semble bloquée. */
async function bingSearch(page, q) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.goto('https://www.bing.com/search?setlang=fr&cc=fr&q=' + encodeURIComponent(q), { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(1200)
      const links = await page.$$eval('li.b_algo h2 a', (as) => as.map((a) => a.href))
      const text = (await page.innerText('body').catch(() => '')).toLowerCase()
      const captcha = /captcha|unusual traffic|vérifiez que vous êtes|verify you are/.test(text)
      if (links.length) { consecutiveEmpty = 0; return { urls: links.map(decodeBing), ok: true } }
      if (captcha) return { urls: [], ok: false, captcha: true }
      if (/aucun résultat/.test(text) && attempt === 1) { consecutiveEmpty++; return { urls: [], ok: consecutiveEmpty < 3 } }
    } catch { /* retry */ }
    await sleep(2500)
  }
  consecutiveEmpty++
  return { urls: [], ok: consecutiveEmpty < 3 }
}

async function guardBlock(res) {
  if (res.ok) return
  pauses++
  if (res.captcha || pauses > 3) {
    log(`Bing demande une vérification ou bloque (${res.captcha ? 'CAPTCHA' : 'résultats vides répétés'}). Arrêt pour éviter d'insister : relancez plus tard (la reprise est automatique).`)
    await finish(2)
  }
  log(`Recherches vides à la suite : pause de 3 minutes (${pauses}/3)…`)
  consecutiveEmpty = 0
  await sleep(180000)
}

// ---------------------------------------------------------------- vérification d'un site candidat
async function getPage(url, ms = 12000) {
  const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(ms), headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'fr-FR,fr;q=0.9' } })
  const buf = Buffer.from(await r.arrayBuffer()).subarray(0, 3000000)
  const ct = r.headers.get('content-type') || ''
  let cs = /charset=([\w-]+)/i.exec(ct)?.[1] || /charset=["']?([\w-]+)/i.exec(buf.subarray(0, 4000).toString('latin1'))?.[1] || 'utf-8'
  let text
  try { text = new TextDecoder(cs).decode(buf) } catch { text = buf.toString('utf8') }
  return { status: r.status, url: r.url, text }
}

/** → { level: 'ok' | 'weak', url } ou null */
async function verify(host, row, toks) {
  let r
  for (const proto of ['https', 'http']) {
    try { r = await getPage(`${proto}://${host}/`); break } catch { /* essai suivant */ }
  }
  const hostTok = toks.some((t) => host.replace(/[^a-z0-9]/g, '').includes(t))
  if (!r || r.status >= 400) {
    dbg(host, 'injoignable ou HTTP', r?.status)
    // le serveur existe et porte le nom du domaine mais bloque les robots : probablement le bon site, à vérifier à la main
    return hostTok && (!r || [403, 429, 503].includes(r.status)) ? { level: 'weak', url: `https://${host}/` } : null
  }
  const fh = new URL(r.url).host.toLowerCase().replace(/^www\./, '')
  if (PARKING.some((p) => fh.includes(p))) { dbg(host, 'domaine parking'); return null }
  const txt = stripAcc(r.text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')).toLowerCase()
  if (!WINE.test(txt)) { dbg(host, 'aucun mot viticole'); return null }
  const title = /<title[^>]*>([\s\S]*?)<\/title>/.exec(txt)?.[1] || ''
  const h1 = [...txt.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1]).join(' ')
  const hostN = fh.replace(/[^a-z0-9]/g, '')
  const hits = toks.filter((t) => hostN.includes(t) || title.includes(t) || h1.includes(t) || txt.slice(0, 30000).includes(t))
  const need = Math.max(1, Math.ceil(toks.length / 2))
  if (toks.length && hits.length < need) { dbg(host, `nom absent (jetons ${toks.join('/')}, trouvés ${hits.join('/') || 'aucun'})`); return null }
  const commune = stripAcc(row.commune || '').toLowerCase()
  const located = (t) => (commune && t.includes(commune)) || (row.cp && t.includes(row.cp))
  if (located(txt)) return { level: 'ok', url: r.url }
  const links = [...r.text.matchAll(/href=["']([^"'#]*(?:contact|mention|acces|nous-trouver)[^"'#]*)["']/gi)].map((m) => m[1]).slice(0, 2)
  for (const l of links) {
    try {
      const p = await getPage(new URL(l, r.url).toString(), 8000)
      if (p.status < 400 && located(stripAcc(p.text).toLowerCase())) return { level: 'ok', url: r.url }
    } catch { /* page facultative */ }
  }
  const hostHit = toks.some((t) => hostN.includes(t))
  if (hostHit) return { level: 'weak', url: r.url }
  dbg(host, `commune/CP introuvables (${row.commune} ${row.cp})`)
  return null
}

function candidatesFrom(urls, toks) {
  const hosts = [], socials = []
  for (const u of urls) {
    let h
    try { h = new URL(u).hostname.toLowerCase().replace(/^www\./, '') } catch { continue }
    if (/(facebook|instagram)\./.test(h)) { if (toks.some((t) => stripAcc(u).toLowerCase().includes(t))) socials.push(u); continue }
    if (BLOCK.some((b) => h.includes(b)) || hosts.includes(h)) continue
    hosts.push(h)
  }
  return { hosts: hosts.slice(0, 5), socials }
}

// ---------------------------------------------------------------- boucle principale
const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : { done: {} }
const saveState = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 1))
if (!fs.existsSync(REPORT_FILE)) fs.writeFileSync(REPORT_FILE, '﻿date;siren;nom;commune;resultat;url;detail\n')
const report = (row, result, url = '', detail = '') =>
  fs.appendFileSync(REPORT_FILE, [new Date().toISOString().slice(0, 16), row.siren, `"${(row.brand || row.name).replace(/"/g, '""')}"`, row.commune, result, url, `"${detail.replace(/"/g, '""')}"`].join(';') + '\n')

const stats = { trouve: 0, aVerifier: 0, sansSite: 0, incertain: 0 }
let stopping = false
async function finish(code = 0) {
  saveState()
  log(`Terminé — sites trouvés : ${stats.trouve} · à vérifier : ${stats.aVerifier} · sans site (vérifié) : ${stats.sansSite} · incertains : ${stats.incertain}`)
  log(`Rapport : ${REPORT_FILE.pathname.replace(/^\//, '')}`)
  try { await browser?.close() } catch { /* ignore */ }
  process.exit(code)
}
process.on('SIGINT', () => { stopping = true; log('Arrêt demandé : fin de la fiche en cours…') })

async function main() {
  log(`Admin : ${ADMIN} · départements : ${DEPTS} · navigateur : ${BROWSER}`)
  const list = await api(`/leads?dept=${DEPTS}&site=aucun,inconnu&per=500&sort=score&dir=desc`)
  if (list.error) throw new Error(list.error)
  const todo = list.items.filter((i) => !['manual', 'search'].includes(i.url_source) && !state.done[i.siren]).slice(0, LIMIT)
  log(`${list.total} domaines sans site détecté, ${todo.length} à vérifier (les autres sont déjà traités).`)
  if (!todo.length) return finish(0)
  await openBrowser()
  let n = 0, next = 0
  const work = async (page) => {
  while (next < todo.length) {
    const item = todo[next++]
    if (stopping) break
    n++
    const row = await api(`/lead/${item.siren}`)
    if (row.error) { log('Fiche illisible', item.siren); continue }
    const label = cleanLabel(row.brand || row.name)
    const toks = nameTokens(row.brand, row.name)
    const queries = [`${label} ${row.commune} vin site officiel`, `${label} vigneron ${row.commune} contact`]
    let outcome = null, searches = 0, emptyBoth = false, socials = []
    for (const q of queries) {
      const res = await bingSearch(page, q)
      searches += res.ok && res.urls.length ? 1 : 0
      if (!res.ok) { await guardBlock(res); continue }
      const { hosts, socials: s } = candidatesFrom(res.urls, toks)
      dbg(`recherche « ${q} » → candidats : ${hosts.join(', ') || 'aucun'}`)
      socials.push(...s)
      let weak = null
      for (const h of hosts) {
        const v = await verify(h, row, toks)
        if (v?.level === 'ok') { outcome = v; break }
        if (v?.level === 'weak' && !weak) weak = v
      }
      if (outcome) break
      if (weak && !outcome) outcome = weak
      if (outcome) break
      await sleep((7000 + Math.random() * 5000) * FAST)
    }
    const tag = `[${n}/${todo.length}] ${label} (${row.commune})`
    if (outcome?.level === 'ok') {
      await api(`/lead/${item.siren}`, { url: outcome.url })
      await api(`/lead/${item.siren}/audit`, {})
      stats.trouve++; log(`${tag} → SITE ${outcome.url}`); report(row, 'trouve', outcome.url)
    } else if (outcome?.level === 'weak') {
      await api(`/lead/${item.siren}/note`, { kind: 'note', text: `Site probable à vérifier (recherche Bing) : ${outcome.url}` })
      stats.aVerifier++; log(`${tag} → à vérifier ${outcome.url}`); report(row, 'a_verifier', outcome.url)
    } else if (searches >= 2 && CONFIRM_NONE) {
      await api(`/lead/${item.siren}/nosite`, { source: 'search', detail: '2 recherches Bing, aucun site officiel' })
      stats.sansSite++; log(`${tag} → aucun site (2 recherches)`); report(row, 'sans_site', '', socials.slice(0, 2).join(' '))
    } else {
      stats.incertain++; log(`${tag} → incertain (${searches} recherche(s) exploitable(s))`); report(row, 'incertain')
    }
    if (outcome || (searches >= 2 && CONFIRM_NONE)) state.done[item.siren] = { at: new Date().toISOString() } // les « incertains » seront retentés
    if (n % 5 === 0) saveState()
    await sleep((6000 + Math.random() * 5000) * FAST)
  }
  }
  await Promise.all(pages.map((pg) => work(pg)))
  await finish(0)
}
main().catch(async (e) => { console.error('Erreur :', e.message); await finish(1) })
