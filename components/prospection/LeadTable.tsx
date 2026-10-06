'use client'

import { Prio, SITE, STATUS_TONE, Tag, eur } from './ui'

export interface LeadRow {
  siren: string; name: string; brand?: string; commune?: string; dept: string; legal?: string; dirigeant?: string
  eff_code?: string; ca?: number; url?: string; url_source?: string; site_status: string; obs?: number | null
  signals: { k: string; label: string; tone: string }[]; score: number; prio: string; pack?: string | null; abo: string
  deal: number; status: string; next_action?: string | null; saved?: number
}

interface Props {
  items: LeadRow[]
  effLabels: Record<string, string>
  compact?: boolean
  sort?: string
  dir?: string
  onSort?: (k: string) => void
  selected?: Set<string>
  onToggle?: (siren: string, on: boolean) => void
  onToggleAll?: (on: boolean) => void
  onOpen: (siren: string) => void
}

function SiteCell({ L }: { L: LeadRow }) {
  const [label, tone] = SITE[L.site_status] || ['?', '']
  const unconfirmed = L.site_status === 'aucun' && L.url_source !== 'manual' && L.url_source !== 'search'
  const host = L.url ? L.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '') : ''
  return (
    <>
      <Tag tone={tone}>{label}{unconfirmed ? ' ?' : ''}</Tag>
      {host ? <div className="text-xs text-gray-500 mt-0.5">{host}</div> : null}
      {L.obs != null ? <div className="text-xs text-gray-500">obsolescence {L.obs}/100</div> : null}
    </>
  )
}

function ScoreCell({ L }: { L: LeadRow }) {
  const c = L.prio === 'A' ? '#b42318' : L.prio === 'B' ? '#d9822b' : '#98a2b3'
  return (
    <div className="flex items-center gap-2">
      <Prio p={L.prio} /> <b>{Math.round(L.score)}</b>
      <div className="w-14 h-1.5 bg-stone-200 rounded overflow-hidden"><i className="block h-full" style={{ width: `${L.score}%`, background: c }} /></div>
    </div>
  )
}

export default function LeadTable({ items, effLabels, compact, sort, dir, onSort, selected, onToggle, onToggleAll, onOpen }: Props) {
  if (!items.length) return <div className="card text-center text-gray-500 py-12">Aucun prospect ne correspond à ces filtres.</div>
  const Th = ({ k, children }: { k: string; children: string }) => (
    <th className={`px-3 py-2.5 text-left text-[11px] uppercase tracking-wide text-gray-500 font-semibold whitespace-nowrap ${onSort ? 'cursor-pointer select-none' : ''}`} onClick={() => onSort?.(k)}>
      {children}{sort === k ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  )
  const H = ({ children }: { children: string }) => <th className="px-3 py-2.5 text-left text-[11px] uppercase tracking-wide text-gray-500 font-semibold whitespace-nowrap">{children}</th>
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 border-b border-gray-200">
          <tr>
            {!compact && <th className="w-8 px-3"><input type="checkbox" onChange={(e) => onToggleAll?.(e.target.checked)} /></th>}
            {compact ? <H>Domaine</H> : <Th k="name">Domaine</Th>}
            <H>Taille</H><H>Site web</H><H>Signaux</H>
            {compact ? <H>Score</H> : <Th k="score">Score</Th>}
            <H>Offre</H>
            {compact ? <H>Statut</H> : <Th k="deal">Valeur</Th>}
          </tr>
        </thead>
        <tbody>
          {items.map((L) => (
            <tr key={L.siren} className="border-b border-gray-100 hover:bg-rose-50/40 cursor-pointer align-top" onClick={() => onOpen(L.siren)}>
              {!compact && (
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={!!selected?.has(L.siren)} onChange={(e) => onToggle?.(L.siren, e.target.checked)} />
                </td>
              )}
              <td className="px-3 py-2.5 min-w-[220px]">
                <div className="font-semibold">{L.saved ? <span className="text-amber-500 mr-1" title="Prospect sauvegardé">★</span> : null}{L.brand || L.name}</div>
                <div className="text-xs text-gray-500">{L.commune} ({L.dept}) · {L.legal}{L.dirigeant ? ` · ${L.dirigeant}` : ''}</div>
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap">{effLabels[L.eff_code || ''] || 'n.c.'}<div className="text-xs text-gray-500">{L.ca ? `CA ${eur(L.ca)}` : ''}</div></td>
              <td className="px-3 py-2.5"><SiteCell L={L} /></td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {(L.signals || []).filter((s) => !['ok', 'employer', 'vinifie', 'ca'].includes(s.k) || s.tone === 'hot').slice(0, 3).map((s) => <Tag key={s.k} tone={s.tone}>{s.label}</Tag>)}
                </div>
              </td>
              <td className="px-3 py-2.5"><ScoreCell L={L} /></td>
              <td className="px-3 py-2.5 whitespace-nowrap">{L.pack ? <Tag tone="wine">{L.pack}</Tag> : null} <Tag>{L.abo}</Tag></td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                {compact ? <Tag tone={STATUS_TONE[L.status]}>{L.status}</Tag> : (<><b>{eur(L.deal)}</b><div><Tag tone={STATUS_TONE[L.status]}>{L.status}</Tag></div></>)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
