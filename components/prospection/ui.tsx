'use client'

import { ReactNode } from 'react'

export const BASE = '/api/prospection'

export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, body !== undefined
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : undefined)
  const d = await r.json().catch(() => ({}))
  if (!r.ok && !d?.error) throw new Error(`Erreur ${r.status}`)
  return d as T
}

export const eur = (v: number | null | undefined) =>
  v == null ? '—' : v >= 1e6 ? `${(v / 1e6).toFixed(1).replace('.', ',')} M€` : v >= 1e3 ? `${Math.round(v / 1e3).toLocaleString('fr-FR')} k€` : `${Math.round(v)} €`
export const eurFull = (v: number | null | undefined) => `${Math.round(v || 0).toLocaleString('fr-FR')} €`
export const num = (v: number | null | undefined) => (v || 0).toLocaleString('fr-FR')
export const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)} %` : '—')
export const today = () => new Date().toISOString().slice(0, 10)
export const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

export const SITE: Record<string, [string, string]> = {
  aucun: ['Sans site', 'hot'], hs: ['Site HS', 'hot'], obsolete: ['Obsolète', 'hot'], vieillissant: ['Vieillissant', 'warm'],
  moderne: ['Moderne', 'ok'], inconnu: ['Non vérifié', ''],
}
export const STATUS_TONE: Record<string, string> = {
  Nouveau: '', 'À contacter': 'info', Contacté: 'wine', 'RDV / Audit': 'warm', 'Devis envoyé': 'warm', Gagné: 'ok', Perdu: 'hot', Exclu: '',
}
export const EFFS: [string, string][] = [['NN', 'Non employeur'], ['00', '0 sal.'], ['01', '1-2'], ['02', '3-5'], ['03', '6-9'], ['11', '10-19'], ['12', '20-49'], ['21', '50+']]

const TONES: Record<string, string> = {
  '': 'bg-gray-100 text-gray-600',
  hot: 'bg-red-50 text-red-700',
  warm: 'bg-amber-50 text-amber-700',
  ok: 'bg-green-50 text-green-700',
  info: 'bg-blue-50 text-blue-700',
  wine: 'bg-wine/10 text-wine',
  bad: 'bg-gray-100 text-gray-500',
}

export function Tag({ tone = '', children, className = '' }: { tone?: string; children: ReactNode; className?: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${TONES[tone] || TONES['']} ${className}`}>{children}</span>
}

export function Prio({ p, small }: { p: string; small?: boolean }) {
  const c = p === 'A' ? 'bg-red-600' : p === 'B' ? 'bg-orange-500' : 'bg-gray-400'
  return <span className={`inline-grid place-items-center rounded-md font-bold text-white ${c} ${small ? 'w-[18px] h-[18px] text-[11px]' : 'w-[22px] h-[22px] text-xs'}`}>{p}</span>
}

export function Kpi({ label, value, hint, tone = '' }: { label: string; value: ReactNode; hint?: ReactNode; tone?: '' | 'hot' | 'wine' | 'ok' }) {
  const c = tone === 'hot' ? 'text-red-700' : tone === 'wine' ? 'text-wine' : tone === 'ok' ? 'text-green-700' : 'text-gray-900'
  return (
    <div className="card !p-4">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 tabular-nums ${c}`}>{value}</div>
      {hint ? <div className="text-xs text-gray-500 mt-0.5">{hint}</div> : null}
    </div>
  )
}

export function Bars({ rows, max, fmt }: { rows: { n: string; v: number; v2?: number }[]; max?: number; fmt?: (r: any) => string }) {
  const m = max || Math.max(1, ...rows.map((r) => r.v))
  if (!rows.length) return <div className="text-sm text-gray-500">Aucune donnée</div>
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.n} className="flex items-center gap-3 text-sm">
          <div className="w-36 shrink-0 truncate" title={r.n}>{r.n}</div>
          <div className="flex-1 h-2.5 bg-stone-100 rounded-full overflow-hidden flex">
            <i className="block h-full bg-wine" style={{ width: `${(100 * r.v) / m}%` }} />
            {r.v2 != null ? <i className="block h-full bg-wine/40" style={{ width: `${(100 * r.v2) / m}%` }} /> : null}
          </div>
          <div className="w-24 text-right text-xs text-gray-500 tabular-nums">{fmt ? fmt(r) : num(r.v)}</div>
        </div>
      ))}
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mt-6 mb-2">{children}</h2>
}

export function Btn({ children, onClick, primary, small, disabled, href, title }: {
  children: ReactNode; onClick?: () => void; primary?: boolean; small?: boolean; disabled?: boolean; href?: string; title?: string
}) {
  const cls = `${small ? 'px-2.5 py-1 text-[13px]' : 'px-3.5 py-2 text-sm'} rounded-lg border font-medium transition disabled:opacity-50 ${
    primary ? 'bg-wine text-white border-wine hover:bg-[#5a2530]' : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
  }`
  if (href) return <a className={`${cls} inline-block`} href={href} title={title}>{children}</a>
  return <button className={cls} onClick={onClick} disabled={disabled} title={title}>{children}</button>
}

export const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-wine/30 focus:border-wine'
