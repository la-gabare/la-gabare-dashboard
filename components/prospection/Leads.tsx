'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import LeadTable from './LeadTable'
import { BASE, Btn, EFFS, SITE, api, eur, inputCls } from './ui'

export type Filters = Record<string, string | string[]>

export const DEFAULT_FILTERS: Filters = { hide_coop: '1' }

export const PRESETS: Record<string, { label: string; f: Filters }> = {
  saved: { label: '★ Sauvegardés', f: { saved: '1' } },
  hot: { label: 'Sans site · employeurs', f: { site: ['aucun', 'hs'], employer: '1', hide_coop: '1' } },
  refonte: { label: 'Refontes prioritaires', f: { site: ['obsolete', 'vieillissant'], min_score: '40', hide_coop: '1' } },
  boutique: { label: 'Boutique à créer', f: { no_shop: '1', eff_min: '3', hide_coop: '1' } },
  evin: { label: 'Conformité Évin', f: { no_evin: '1', hide_coop: '1' } },
  recent: { label: 'Créations récentes', f: { recent: '6', employer: '1', hide_coop: '1' } },
  multi: { label: 'Multi-établissements', f: { multi: '1', hide_coop: '1' } },
  growth: { label: 'CA en hausse', f: { growth: '1', hide_coop: '1' } },
  transm: { label: 'Transmission', f: { transmission: '1', employer: '1', hide_coop: '1' } },
  ready: { label: 'Prêts à contacter', f: { has_email: '1', prio: ['A', 'B'], status: ['Nouveau'], hide_coop: '1' } },
}

export function qsFrom(F: Filters, extra: Record<string, string | number> = {}) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(F)) {
    const val = Array.isArray(v) ? v.join(',') : v
    if (val !== '' && val != null && val.length !== 0) p.set(k, val)
  }
  for (const [k, v] of Object.entries(extra)) p.set(k, String(v))
  return p.toString()
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-gray-100 last:border-0">
      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">{title}</div>
      {children}
    </div>
  )
}

export default function Leads({ cfg, F, setF, onOpen, refreshKey }: {
  cfg: any; F: Filters; setF: (f: Filters) => void; onOpen: (s: string) => void; refreshKey: number
}) {
  const [data, setData] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('score')
  const [dir, setDir] = useState('desc')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [bStatus, setBStatus] = useState('')
  const [bDate, setBDate] = useState('')
  const [err, setErr] = useState('')
  const [q, setQ] = useState((F.q as string) || '')
  const [busy, setBusy] = useState(false)
  const timer = useRef<any>(null)
  const reqId = useRef(0)

  const load = async () => {
    const id = ++reqId.current
    try {
      const d = await api(`/leads?${qsFrom(F, { sort, dir, page, per: 50 })}`)
      if (id !== reqId.current) return
      if (d.error) setErr(d.error); else { setErr(''); setData(d) }
    } catch (e: any) { setErr(e.message) }
  }
  useEffect(() => { load() }, [JSON.stringify(F), page, sort, dir, refreshKey])

  const upd = (k: string, v: string | string[] | null) => {
    const n = { ...F }
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) delete n[k]; else n[k] = v
    setPage(1); setF(n)
  }
  const toggle = (k: string, v: string) => {
    const cur = (F[k] as string[]) || []
    upd(k, cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v])
  }
  const onQ = (v: string) => { setQ(v); clearTimeout(timer.current); timer.current = setTimeout(() => upd('q', v), 300) }

  const Chips = ({ k, opts }: { k: string; opts: [string, string][] }) => (
    <div className="flex flex-wrap gap-1.5">
      {opts.map(([v, l]) => {
        const on = ((F[k] as string[]) || []).includes(v)
        return <button key={v} onClick={() => toggle(k, v)} className={`px-2.5 py-0.5 rounded-full text-[13px] border ${on ? 'bg-wine text-white border-wine' : 'bg-white border-gray-200 hover:border-gray-300'}`}>{l}</button>
      })}
    </div>
  )
  const Check = ({ k, label, v = '1' }: { k: string; label: string; v?: string }) => (
    <label className="flex items-center gap-2 text-[13px] my-1 cursor-pointer">
      <input type="checkbox" className="accent-[#722f37]" checked={F[k] === v} onChange={(e) => upd(k, e.target.checked ? v : null)} />{label}
    </label>
  )

  const zones = Array.from(new Set(Object.values(cfg.zones as Record<string, string>))).map((z) => [z, z] as [string, string])
  const depts = Object.keys(cfg.zones).map((d) => [d, `${d} ${cfg.dept_names[d]}`] as [string, string])
  const pages = data ? Math.max(1, Math.ceil(data.total / data.per)) : 1

  const applyBulk = async () => {
    if (!bStatus && !bDate) return
    setBusy(true)
    await api('/bulk', { sirens: [...sel], ...(bStatus ? { status: bStatus } : {}), ...(bDate ? { next_action: bDate } : {}) })
    setSel(new Set()); setBStatus(''); setBDate(''); setBusy(false); load()
  }

  return (
    <div className="flex gap-4 items-start flex-col lg:flex-row">
      <div className="card !p-0 w-full lg:w-72 shrink-0 lg:sticky lg:top-3 lg:max-h-[calc(100vh-24px)] overflow-auto">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Vues rapides</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(PRESETS).map(([k, p]) => (
              <button key={k} onClick={() => { setPage(1); setQ(''); setF(JSON.parse(JSON.stringify(p.f))) }} className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold bg-wine/10 text-wine border border-wine/20 hover:bg-wine/20">{p.label}</button>
            ))}
          </div>
        </div>
        <Group title="Recherche"><input className={inputCls} type="search" placeholder="Nom, commune, dirigeant, SIREN…" value={q} onChange={(e) => onQ(e.target.value)} /></Group>
        <Group title="Priorité & score">
          <Chips k="prio" opts={[['A', 'A — chaud'], ['B', 'B — tiède'], ['C', 'C — froid']]} />
          <div className="flex items-center gap-2 mt-2 text-[13px] text-gray-500">Score ≥ <input className={`${inputCls} !w-20`} type="number" min={0} max={100} value={(F.min_score as string) || ''} onChange={(e) => upd('min_score', e.target.value)} /></div>
        </Group>
        <Group title="Site web">
          <Chips k="site" opts={Object.entries(SITE).map(([k, v]) => [k, v[0]] as [string, string])} />
          <div className="mt-2"><Check k="has_url" label="Site détecté" /><Check k="has_url" label="Aucun site renseigné" v="0" /></div>
        </Group>
        <Group title="Constats de l'audit">
          <Check k="no_mobile" label="Non adapté mobile" /><Check k="no_https" label="Pas de HTTPS" /><Check k="no_shop" label="Pas de boutique en ligne" />
          <Check k="no_evin" label="Message sanitaire loi Évin absent" /><Check k="no_social" label="Aucun réseau social" /><Check k="tourism" label="Œnotourisme présent" />
        </Group>
        <Group title="Zone & département"><Chips k="zone" opts={zones} /><div className="h-1.5" /><Chips k="dept" opts={depts} /></Group>
        <Group title="Taille">
          <Chips k="eff" opts={EFFS} />
          <div className="flex items-center gap-2 mt-2 text-[13px] text-gray-500">CA (k€)
            <input className={inputCls} type="number" placeholder="min" value={(F.ca_min as string) || ''} onChange={(e) => upd('ca_min', e.target.value)} />
            <input className={inputCls} type="number" placeholder="max" value={(F.ca_max as string) || ''} onChange={(e) => upd('ca_max', e.target.value)} />
          </div>
          <div className="mt-1.5"><Check k="employer" label="Employeurs uniquement" /></div>
        </Group>
        <Group title="Expansion & timing">
          <select className={inputCls} value={(F.recent as string) || ''} onChange={(e) => upd('recent', e.target.value)}>
            <option value="">Âge de l&apos;entreprise : tous</option><option value="3">Créée il y a ≤ 3 ans</option><option value="6">≤ 6 ans</option><option value="10">≤ 10 ans</option>
          </select>
          <div className="mt-1.5">
            <Check k="multi" label="Plusieurs établissements" /><Check k="growth" label="CA en hausse (≥ +10 %)" />
            <Check k="transmission" label="Transmission (dirigeant 60+ / successeur)" /><Check k="young" label="Dirigeant de moins de 40 ans" />
          </div>
        </Group>
        <Group title="Profil">
          <Chips k="legal" opts={['EI', 'EARL', 'SCEA', 'SARL', 'SAS', 'GAEC', 'SA', 'EURL', 'SASU'].map((x) => [x, x] as [string, string])} />
          <div className="mt-2">
            <Chips k="naf" opts={[['01.21Z', 'Culture de la vigne'], ['11.02', 'Vinification']]} />
            <Check k="bio" label="Certifié bio" /><Check k="vinifie" label="Vinifie / vend du vin" /><Check k="hide_coop" label="Masquer coopératives & coopérateurs probables" />
          </div>
        </Group>
        <Group title="Offre recommandée">
          <Chips k="pack" opts={[['Essentiel', 'Essentiel'], ['Pro', 'Pro'], ['Premium', 'Premium']]} /><div className="h-1.5" />
          <Chips k="abo" opts={[['Village', 'Village'], ['Réserve', 'Réserve'], ['Grand Cru', 'Grand Cru']]} />
        </Group>
        <Group title="Contact"><Check k="has_email" label="Email trouvé" /><Check k="has_phone" label="Téléphone trouvé" /></Group>
        <Group title="Pipeline">
          <Chips k="status" opts={cfg.statuses.map((x: string) => [x, x] as [string, string])} />
          <div className="mt-1.5"><Check k="saved" label="★ Sauvegardés uniquement" /><Check k="due" label="Relance due" /></div>
        </Group>
        <div className="px-4 py-3"><Btn onClick={() => { setPage(1); setQ(''); setF({ ...DEFAULT_FILTERS }) }}>Réinitialiser les filtres</Btn></div>
      </div>

      <div className="flex-1 min-w-0 w-full">
        {err ? <div className="card text-red-700">{err}</div> : !data ? <div className="text-gray-500">Chargement…</div> : (
          <>
            <div className="flex items-center gap-3 mb-3 flex-wrap text-sm text-gray-600">
              <div><b>{data.total.toLocaleString('fr-FR')}</b> prospects · valeur potentielle <b>{eur(data.deal_sum)}</b> · MRR <b>{eur(data.mrr_sum)}/mois</b></div>
              <div className="flex-1" />
              <Btn small href={`${BASE}/export?${qsFrom(F)}`}>Exporter CSV</Btn>
            </div>
            <LeadTable
              items={data.items} effLabels={cfg.eff_labels} sort={sort} dir={dir} onOpen={onOpen} selected={sel}
              onSort={(k) => { if (sort === k) setDir(dir === 'asc' ? 'desc' : 'asc'); else { setSort(k); setDir(k === 'name' ? 'asc' : 'desc') } }}
              onToggle={(s, on) => { const n = new Set(sel); on ? n.add(s) : n.delete(s); setSel(n) }}
              onToggleMany={(list, on) => { const n = new Set(sel); list.forEach((s) => (on ? n.add(s) : n.delete(s))); setSel(n) }}
              onToggleAll={(on) => setSel(on ? new Set(data.items.map((i: any) => i.siren)) : new Set())}
            />
            <div className="flex items-center justify-center gap-3 mt-3 text-sm text-gray-500">
              <Btn small disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Précédent</Btn>Page {page} / {pages}
              <Btn small disabled={page >= pages} onClick={() => setPage(page + 1)}>Suivant ›</Btn>
            </div>
            {sel.size > 0 && (
              <div className="sticky bottom-3 mt-3 bg-[#24101a] text-white rounded-lg px-4 py-2.5 flex items-center gap-3 flex-wrap">
                <b>{sel.size}</b> sélectionné(s)
                <select className="text-gray-900 rounded px-2 py-1 text-sm" value={bStatus} onChange={(e) => setBStatus(e.target.value)}>
                  <option value="">Changer le statut…</option>{cfg.statuses.map((s: string) => <option key={s}>{s}</option>)}
                </select>
                <input type="date" className="text-gray-900 rounded px-2 py-1 text-sm" value={bDate} onChange={(e) => setBDate(e.target.value)} title="Prochaine action" />
                <Btn small onClick={applyBulk} disabled={busy}>Appliquer</Btn>
                <Btn small onClick={async () => { setBusy(true); await api('/bulk', { sirens: [...sel], saved: true }); setBusy(false); setSel(new Set()); load() }} disabled={busy}>★ Sauvegarder</Btn>
                <Btn small onClick={async () => { setBusy(true); await api('/bulk', { sirens: [...sel], saved: false }); setBusy(false); setSel(new Set()); load() }} disabled={busy}>Retirer ★</Btn>
                <Btn small onClick={async () => { setBusy(true); for (let i = 0; i < sel.size; i += 4) await api('/batch', { kind: 'audit', sirens: [...sel].slice(i, i + 4) }); setBusy(false); load() }} disabled={busy}>Auditer</Btn>
                <Btn small onClick={() => setSel(new Set())}>Vider</Btn>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
