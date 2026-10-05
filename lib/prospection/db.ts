import 'server-only'
import { prospectionDb } from './client'
import { DEFAULT_SETTINGS, EFF_LABEL, STATUS_PROBA, STATUSES } from './constants'
import { auditUrl } from './audit'
import { discoverSite } from './discover'
import { buildMessage, computeScoreColumns, scoreLead } from './scoring'
import type { IdentityRow } from './sirene'
import type { Prospect, Settings } from './types'

const db = () => prospectionDb
const nowIso = () => new Date().toISOString()
const todayStr = () => new Date().toISOString().slice(0, 10)

// Colonnes renvoyées dans les listes (on évite les gros champs : audit, notes, gbp)
const LIST_COLS = [
  'siren', 'name', 'brand', 'legal', 'legal_code', 'commune', 'dept', 'zone', 'cp', 'dirigeant', 'eff_code', 'eff_mid', 'ca', 'created',
  'url', 'url_source', 'url_verified', 'site_status', 'email', 'phone', 'status', 'next_action', 'last_contact', 'score', 'prio', 'pack',
  'abo', 'deal', 'mrr', 'signals', 'obs', 'socials', 'updated_at',
].join(',')

// --------------------------------------------------------------------------- //
//  Réglages
// --------------------------------------------------------------------------- //
export async function getSettings(): Promise<Settings> {
  const { data } = await db().from('prospection_settings').select('k,v')
  const s: Record<string, string> = { ...DEFAULT_SETTINGS }
  for (const r of data || []) s[r.k] = r.v ?? ''
  return s as unknown as Settings
}

export async function saveSettings(input: Record<string, unknown>): Promise<Settings> {
  const rows = Object.keys(DEFAULT_SETTINGS).filter((k) => k in input).map((k) => ({ k, v: String(input[k] ?? '') }))
  if (rows.length) await db().from('prospection_settings').upsert(rows, { onConflict: 'k' })
  return getSettings()
}

// --------------------------------------------------------------------------- //
//  Filtres
// --------------------------------------------------------------------------- //
type Params = { get(k: string): string | null }

const clean = (s: string) => s.replace(/[,()*\\%]/g, ' ').trim()
const multi = (p: Params, k: string): string[] => (p.get(k) || '').split(',').filter((x) => x !== '')

export function applyFilters(query: any, p: Params): any {
  const g = (k: string) => p.get(k) || ''
  let q = query
  if (g('q')) {
    const x = clean(g('q'))
    if (x) q = q.or(['name', 'brand', 'commune', 'dirigeant', 'siren', 'url'].map((c) => `${c}.ilike.%${x}%`).join(','))
  }
  for (const [key, col] of [['dept', 'dept'], ['zone', 'zone'], ['site', 'site_status'], ['prio', 'prio'], ['pack', 'pack'], ['abo', 'abo'],
    ['status', 'status'], ['legal', 'legal'], ['naf', 'naf']] as const) {
    let vals = multi(p, key)
    if (key === 'naf' && vals.includes('11.02')) vals = [...vals.filter((v) => v !== '11.02'), '11.02A', '11.02B']
    if (vals.length) q = q.in(col, vals)
  }
  let eff = multi(p, 'eff')
  if (eff.length) {
    if (eff.includes('21')) eff = [...eff, '22', '31', '32', '41', '42', '51', '52', '53']
    const nn = eff.includes('NN')
    const codes = eff.filter((v) => v !== 'NN')
    const parts: string[] = []
    if (nn) parts.push('eff_code.is.null', 'eff_code.eq.NN')
    if (codes.length) parts.push(`eff_code.in.(${codes.join(',')})`)
    q = q.or(parts.join(','))
  }
  if (g('min_score')) q = q.gte('score', parseFloat(g('min_score')))
  if (g('ca_min')) q = q.gte('ca', parseFloat(g('ca_min')) * 1000)
  if (g('ca_max')) q = q.lte('ca', parseFloat(g('ca_max')) * 1000)
  if (g('employer') === '1') q = q.not('eff_code', 'is', null).neq('eff_code', 'NN')
  if (g('employer') === '0') q = q.or('eff_code.is.null,eff_code.eq.NN')
  if (g('eff_min')) q = q.gte('eff_mid', parseFloat(g('eff_min')))
  if (g('bio') === '1') q = q.eq('bio', 1)
  if (g('vinifie') === '1') q = q.eq('vinifie', 1)
  const NY = new Date().getFullYear()
  if (g('transmission') === '1') q = q.or(`successor.eq.1,dir_birth.lte.${NY - 60}`)
  if (g('senior') === '1') q = q.lte('dir_birth', NY - 60)
  if (g('young') === '1') q = q.gte('dir_birth', NY - 40)
  if (g('recent')) q = q.gte('created', `${NY - parseInt(g('recent'), 10)}-01-01`)
  if (g('multi') === '1') q = q.gte('nb_open', 2)
  if (g('growth') === '1') q = q.eq('growth', 1)
  if (g('has_email') === '1') q = q.not('email', 'is', null).neq('email', '')
  if (g('has_email') === '0') q = q.or('email.is.null,email.eq.')
  if (g('has_phone') === '1') q = q.not('phone', 'is', null).neq('phone', '')
  if (g('no_social') === '1') q = q.eq('f_no_social', 1)
  if (g('no_shop') === '1') q = q.eq('f_no_shop', 1)
  if (g('no_evin') === '1') q = q.eq('f_no_evin', 1)
  if (g('no_mobile') === '1') q = q.eq('f_no_mobile', 1)
  if (g('no_https') === '1') q = q.eq('f_no_https', 1)
  if (g('tourism') === '1') q = q.eq('f_tourism', 1)
  if (g('hide_coop') === '1') q = q.eq('coop', 0).eq('coopteur', 0)
  if (g('due') === '1') q = q.not('next_action', 'is', null).lte('next_action', todayStr())
  if (g('has_url') === '1') q = q.not('url', 'is', null).neq('url', '')
  if (g('has_url') === '0') q = q.or('url.is.null,url.eq.')
  return q
}

const SORTS: Record<string, string> = {
  score: 'score', name: 'name', ca: 'ca', eff: 'eff_mid', deal: 'deal', created: 'created', commune: 'commune',
  next: 'next_action', updated: 'updated_at', obs: 'obs',
}

/** Récupère toutes les lignes d'une requête (PostgREST limite à 1000 par appel). */
async function fetchAll<T = any>(build: () => any, cap = 30000): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; from < cap; from += 1000) {
    const { data, error } = await build().range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

export async function listProspects(p: Params) {
  const sort = SORTS[p.get('sort') || 'score'] || 'score'
  const asc = p.get('dir') === 'asc'
  const page = Math.max(1, parseInt(p.get('page') || '1', 10))
  const per = Math.min(500, parseInt(p.get('per') || '50', 10))
  let q = applyFilters(db().from('prospects').select(LIST_COLS, { count: 'exact' }), p)
  q = q.order(sort, { ascending: asc, nullsFirst: false })
  if (sort !== 'score') q = q.order('score', { ascending: false })
  const { data, count, error } = await q.range((page - 1) * per, page * per - 1)
  if (error) throw new Error(error.message)
  // somme des valeurs sur l'ensemble filtré
  const sums = await fetchAll<{ deal: number; mrr: number }>(() => applyFilters(db().from('prospects').select('deal,mrr'), p), 20000)
  const deal_sum = sums.reduce((a, r) => a + (r.deal || 0), 0)
  const mrr_sum = sums.reduce((a, r) => a + (r.mrr || 0), 0)
  return { total: count || 0, page, per, deal_sum, mrr_sum, items: data || [] }
}

export async function getProspect(siren: string) {
  const { data, error } = await db().from('prospects').select('*').eq('siren', siren).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const { data: acts } = await db().from('prospect_activities').select('*').eq('siren', siren).order('id', { ascending: false }).limit(100)
  const sc = scoreLead(data as Prospect)
  return {
    ...data,
    pitch: sc.pitch,
    eff_label: EFF_LABEL[data.eff_code as string] || 'n.c.',
    activities: (acts || []).map((a: any) => ({ ...a, ts: a.ts })),
  }
}

// --------------------------------------------------------------------------- //
//  Écriture
// --------------------------------------------------------------------------- //
export async function logActivity(siren: string, kind: string, text: string) {
  await db().from('prospect_activities').insert({ siren, kind, text })
}

async function loadRow(siren: string): Promise<Prospect | null> {
  const { data } = await db().from('prospects').select('*').eq('siren', siren).maybeSingle()
  return (data as Prospect) || null
}

/** Applique des modifications puis recalcule le score. */
async function patchAndRescore(siren: string, patch: Record<string, unknown>): Promise<Prospect | null> {
  const row = await loadRow(siren)
  if (!row) return null
  const merged = { ...row, ...patch } as Prospect
  const cols = computeScoreColumns(merged)
  const { error } = await db().from('prospects').update({ ...patch, ...cols, updated_at: nowIso() }).eq('siren', siren)
  if (error) throw new Error(error.message)
  return { ...merged, ...cols } as Prospect
}

const EDITABLE = new Set(['url', 'email', 'phone', 'notes', 'status', 'next_action', 'last_contact', 'site_status', 'dirigeant', 'dir_first'])

export async function updateProspect(siren: string, data: Record<string, any>) {
  const old = await loadRow(siren)
  if (!old) return null
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (!EDITABLE.has(k)) continue
    if (k === 'status' && !(STATUSES as readonly string[]).includes(v)) continue
    patch[k] = v === '' && (k === 'next_action' || k === 'last_contact') ? null : v
  }
  if (patch.status && patch.status !== old.status) {
    await logActivity(siren, 'status', `${old.status} → ${patch.status}`)
    if (['Contacté', 'RDV / Audit', 'Devis envoyé'].includes(patch.status as string) && !('last_contact' in data)) patch.last_contact = todayStr()
  }
  if ('url' in patch && (patch.url || '') !== (old.url || '')) {
    patch.url_source = 'manual'
    patch.url_verified = 1
  }
  if (Object.keys(patch).length) await patchAndRescore(siren, patch)
  return getProspect(siren)
}

export async function bulkUpdate(sirens: string[], data: { status?: string; next_action?: string }) {
  for (const s of sirens) await updateProspect(s, { status: data.status, next_action: data.next_action })
}

/** Insère/met à jour l'identité SIRENE en conservant le suivi commercial existant, puis recalcule le score. */
export async function upsertIdentity(rows: IdentityRow[]): Promise<number> {
  if (!rows.length) return 0
  const sirens = rows.map((r) => r.siren)
  const { data: existing } = await db().from('prospects').select('*').in('siren', sirens)
  const byS = new Map((existing || []).map((r: any) => [r.siren, r]))
  const ts = nowIso()
  const out = rows.map((r) => {
    const base = byS.get(r.siren) || { site_status: 'inconnu', status: 'Nouveau', created_at: ts }
    const merged = { ...base, ...r } as Prospect
    // Toutes les lignes d'un upsert doivent porter les mêmes colonnes : on renvoie donc les valeurs de suivi
    // existantes telles quelles (statut, site, date de création) pour ne rien écraser.
    return {
      ...r, ...computeScoreColumns(merged), updated_at: ts,
      site_status: base.site_status, status: base.status, created_at: base.created_at,
    }
  })
  const { error } = await db().from('prospects').upsert(out, { onConflict: 'siren' })
  if (error) throw new Error(error.message)
  return rows.length
}

export async function rescoreAll(): Promise<number> {
  const rows = await fetchAll<Prospect>(() => db().from('prospects').select('*').order('siren'))
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200).map((r) => ({ siren: r.siren, ...computeScoreColumns(r) }))
    const { error } = await db().from('prospects').upsert(chunk, { onConflict: 'siren' })
    if (error) throw new Error(error.message)
  }
  return rows.length
}

export async function auditProspect(siren: string) {
  const row = await loadRow(siren)
  if (!row || !row.url) return null
  const res = await auditUrl(row.url)
  const ts = nowIso()
  const patch: Record<string, unknown> = {
    site_status: res.site_status, audit: res.audit, audit_at: ts, socials: { ...(row.socials || {}), ...res.socials }, site_checked: ts,
  }
  if (!row.email && res.email) patch.email = res.email
  if (!row.phone && res.phone) patch.phone = res.phone
  return patchAndRescore(siren, patch)
}

export async function discoverProspect(siren: string): Promise<'found' | 'none' | 'skipped'> {
  const row = await loadRow(siren)
  if (!row) return 'skipped'
  if (row.url && row.url_source === 'manual') return 'found' // une URL saisie à la main fait foi
  const settings = await getSettings()
  const res = await discoverSite(row, settings)
  const ts = nowIso()
  const patch: Record<string, unknown> = { site_checked: ts }
  if (res.gbp?.found) {
    patch.gbp = res.gbp
    if (!row.phone && res.gbp.phone) patch.phone = res.gbp.phone
  }
  if (res.status === 'found') {
    Object.assign(patch, { url: res.url, url_source: 'auto', url_verified: res.verified })
    await patchAndRescore(siren, patch)
    await auditProspect(siren)
    return 'found'
  }
  // pas trouvé : une ancienne détection automatique non confirmée est purgée, une URL manuelle jamais
  if (row.url_source === 'auto' || !row.url) Object.assign(patch, { url: null, audit: null, site_status: 'aucun' })
  patch.url_source = res.gbp_confirms_none ? 'manual' : row.url_source || 'auto'
  await patchAndRescore(siren, patch)
  return 'none'
}

export async function confirmNoSite(siren: string) {
  await patchAndRescore(siren, { url: null, site_status: 'aucun', url_source: 'manual', audit: null })
  await logActivity(siren, 'note', 'Absence de site confirmée manuellement')
  return getProspect(siren)
}

export async function savePsi(siren: string, psi: NonNullable<Prospect['audit']>['psi']) {
  const row = await loadRow(siren)
  if (!row) return
  await db().from('prospects').update({ audit: { ...(row.audit || {}), psi }, updated_at: nowIso() }).eq('siren', siren)
}

export async function messageFor(siren: string) {
  const row = await loadRow(siren)
  if (!row) return null
  return buildMessage(row, await getSettings())
}

/** Sélectionne les fiches à traiter par un lot (meilleurs scores d'abord). */
export async function pickSirens(mode: 'no_url' | 'has_url', limit: number, filters: Record<string, string> = {}): Promise<string[]> {
  const p: Params = { get: (k) => filters[k] ?? null }
  let q = applyFilters(db().from('prospects').select('siren'), p)
  if (mode === 'no_url') q = q.or('url.is.null,url.eq.').eq('site_status', 'inconnu')
  else q = q.not('url', 'is', null).neq('url', '')
  const { data, error } = await q.order('score', { ascending: false }).limit(Math.min(limit, 2000))
  if (error) throw new Error(error.message)
  return (data || []).map((r: any) => r.siren)
}

// --------------------------------------------------------------------------- //
//  Statistiques / KPI
// --------------------------------------------------------------------------- //
export async function computeStats() {
  const NY = new Date().getFullYear()
  const today = todayStr()
  const rows = await fetchAll<any>(() => db().from('prospects').select(
    'dept,zone,site_status,url_source,status,prio,pack,abo,deal,mrr,eff_code,legal,successor,dir_birth,nb_open,bio,created,growth,vinifie,email,phone,url,audit_at,obs,next_action,score',
  ).order('siren'))
  const total = rows.length
  if (!total) return { total: 0 }
  const inc = (m: Record<string, number>, k: string) => { m[k] = (m[k] || 0) + 1 }
  const by_site: Record<string, number> = {}
  const by_status: Record<string, { c: number; deal: number; mrr: number }> = {}
  const zone = new Map<string, { k: string; c: number; a: number; ns: number }>()
  const dept = new Map<string, { k: string; c: number; a: number }>()
  const pack = new Map<string, { k: string; c: number; d: number }>()
  const abo = new Map<string, { k: string; c: number; m: number }>()
  const eff: Record<string, number> = {}
  const legal: Record<string, number> = {}
  const by_prio: Record<string, number> = {}
  const sig = { transmission: 0, multi: 0, bio: 0, recent: 0, growth: 0, vinifie: 0, has_email: 0, has_phone: 0, has_url: 0, audited: 0, employers: 0 }
  const seg = { sans: 0, a_confirmer: 0, refonte: 0, abo_only: 0, a_auditer: 0 }
  let qualified = 0, prioA = 0, due = 0, obsSum = 0, obsN = 0
  for (const r of rows) {
    if (r.score >= 42) qualified++
    if (r.prio === 'A') prioA++
    inc(by_site, r.site_status)
    const s = (by_status[r.status] ||= { c: 0, deal: 0, mrr: 0 })
    s.c++; s.deal += r.deal || 0; s.mrr += r.mrr || 0
    const z = zone.get(r.zone) || { k: r.zone, c: 0, a: 0, ns: 0 }
    z.c++; if (r.prio === 'A') z.a++; if (r.site_status === 'aucun' || r.site_status === 'hs') z.ns++
    zone.set(r.zone, z)
    const d = dept.get(r.dept) || { k: r.dept, c: 0, a: 0 }
    d.c++; if (r.prio === 'A') d.a++
    dept.set(r.dept, d)
    const ab = r.prio === 'A' || r.prio === 'B'
    if (ab) {
      const pk = r.pack || 'Abonnement seul'
      const p = pack.get(pk) || { k: pk, c: 0, d: 0 }
      p.c++; p.d += r.deal || 0
      pack.set(pk, p)
      const a = abo.get(r.abo) || { k: r.abo, c: 0, m: 0 }
      a.c++; a.m += r.mrr || 0
      abo.set(r.abo, a)
      // « sans site » = confirmé (saisi à la main / fiche Google) ou site injoignable ; « non trouvé » = à confirmer
      if (r.site_status === 'hs' || (r.site_status === 'aucun' && r.url_source === 'manual')) seg.sans++
      else if (r.site_status === 'aucun') seg.a_confirmer++
      else if (r.site_status === 'obsolete' || r.site_status === 'vieillissant') seg.refonte++
      else if (r.site_status === 'moderne') seg.abo_only++
      else if (r.site_status === 'inconnu') seg.a_auditer++
    }
    inc(eff, r.eff_code || 'NN')
    inc(legal, r.legal || '—')
    inc(by_prio, r.prio)
    if (r.successor === 1 || (r.dir_birth && r.dir_birth <= NY - 60)) sig.transmission++
    if ((r.nb_open || 0) >= 2) sig.multi++
    if (r.bio === 1) sig.bio++
    if (r.created && r.created >= `${NY - 6}-01-01`) sig.recent++
    if (r.growth === 1) sig.growth++
    if (r.vinifie === 1) sig.vinifie++
    if (r.email) sig.has_email++
    if (r.phone) sig.has_phone++
    if (r.url) sig.has_url++
    if (r.audit_at) sig.audited++
    if (r.eff_code && r.eff_code !== 'NN') sig.employers++
    if (r.next_action && r.next_action <= today) due++
    if (typeof r.obs === 'number') { obsSum += r.obs; obsN++ }
  }
  const OPEN = ['À contacter', 'Contacté', 'RDV / Audit', 'Devis envoyé']
  const pipeline_weighted = Object.entries(by_status).filter(([k]) => OPEN.includes(k)).reduce((a, [k, v]) => a + v.deal * (STATUS_PROBA[k] || 0), 0)
  const pipeline_potential = Object.entries(by_status).filter(([k]) => OPEN.includes(k)).reduce((a, [, v]) => a + v.deal, 0)
  const cnt = (k: string) => by_status[k]?.c || 0
  const contacted = ['Contacté', 'RDV / Audit', 'Devis envoyé', 'Gagné', 'Perdu'].reduce((a, k) => a + cnt(k), 0)
  const rdv = ['RDV / Audit', 'Devis envoyé', 'Gagné'].reduce((a, k) => a + cnt(k), 0)
  const devis = ['Devis envoyé', 'Gagné'].reduce((a, k) => a + cnt(k), 0)
  const { data: hot } = await db().from('prospects').select(LIST_COLS).eq('prio', 'A').in('status', ['Nouveau', 'À contacter'])
    .order('score', { ascending: false }).limit(10)
  const toList = (o: Record<string, number>) => Object.entries(o).map(([k, c]) => ({ k, c }))
  return {
    total, qualified, prioA, by_site, by_status,
    by_zone: [...zone.values()].sort((a, b) => b.c - a.c), by_dept: [...dept.values()].sort((a, b) => b.c - a.c),
    by_pack: [...pack.values()], by_abo: [...abo.values()], by_eff: toList(eff),
    by_legal: toList(legal).sort((a, b) => b.c - a.c).slice(0, 8), by_prio, signals: sig, due, hot: hot || [],
    avg_obsolescence: obsN ? obsSum / obsN : null, seg,
    funnel: { contacted, rdv, devis, won: cnt('Gagné'), lost: cnt('Perdu') },
    pipeline_potential, pipeline_weighted, won_value: by_status['Gagné']?.deal || 0, won_mrr: by_status['Gagné']?.mrr || 0,
  }
}

export async function exportCsv(p: Params): Promise<string> {
  const rows = await fetchAll<Prospect>(() => applyFilters(db().from('prospects').select('*'), p).order('score', { ascending: false }))
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
  const head = ['SIREN', 'Nom', 'Enseigne', 'Commune', 'CP', 'Dép.', 'Zone', 'Forme', 'Effectif', 'CA', 'Création', 'Dirigeant', 'Site', 'Statut site',
    'Email', 'Téléphone', 'Score', 'Priorité', 'Pack reco', 'Abo reco', 'Valeur 1re année €', 'Statut', 'Prochaine action', 'Signaux', 'Notes']
  const lines = [head.map(esc).join(';')]
  for (const r of rows) {
    lines.push([r.siren, r.name, r.brand, r.commune, r.cp, r.dept, r.zone, r.legal, EFF_LABEL[r.eff_code as string] || '', r.ca, r.created, r.dirigeant,
      r.url, r.site_status, r.email, r.phone, r.score, r.prio, r.pack, r.abo, r.deal, r.status, r.next_action,
      (r.signals || []).map((s) => s.label).join(', '), r.notes].map(esc).join(';'))
  }
  return `﻿${lines.join('\r\n')}`
}
