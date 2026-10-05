'use client'

import { useEffect, useState } from 'react'
import LeadTable from './LeadTable'
import { Prio, SITE, Tag, addDays, api, eur } from './ui'

const COLS = ['À contacter', 'Contacté', 'RDV / Audit', 'Devis envoyé', 'Gagné', 'Perdu']

export function PipelineBoard({ onOpen, refreshKey }: { onOpen: (s: string) => void; refreshKey: number }) {
  const [data, setData] = useState<any[] | null>(null)
  const [over, setOver] = useState('')
  const load = async () => {
    const r = await Promise.all(COLS.map((s) => api(`/leads?${new URLSearchParams({ status: s, sort: 'score', dir: 'desc', per: '100', page: '1' })}`)))
    setData(r)
  }
  useEffect(() => { load() }, [refreshKey])
  if (!data) return <div className="text-gray-500">Chargement…</div>
  const drop = async (e: React.DragEvent, st: string) => {
    e.preventDefault(); setOver('')
    const s = e.dataTransfer.getData('text/plain'); if (!s) return
    const body: any = { status: st }
    if (['Contacté', 'RDV / Audit', 'Devis envoyé'].includes(st)) body.next_action = addDays(4)
    await api(`/lead/${s}`, body); load()
  }
  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">Glissez les cartes d&apos;une colonne à l&apos;autre pour faire avancer vos prospects. Ajoutez des prospects au pipeline depuis l&apos;onglet « Prospects » (sélection multiple → « À contacter »).</p>
      <div className="flex gap-3 overflow-x-auto pb-3 items-start">
        {COLS.map((s, i) => (
          <div key={s} onDragOver={(e) => { e.preventDefault(); setOver(s) }} onDragLeave={() => setOver('')} onDrop={(e) => drop(e, s)}
            className={`w-[268px] shrink-0 bg-stone-200/70 rounded-lg p-2 ${over === s ? 'outline-dashed outline-2 outline-wine' : ''}`}>
            <h4 className="flex justify-between text-[13px] font-semibold mx-1.5 my-1.5"><span>{s} · {data[i].total}</span><span className="text-gray-500 font-normal">{eur(data[i].deal_sum)}</span></h4>
            {data[i].items.length ? data[i].items.map((L: any) => (
              <div key={L.siren} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', L.siren)} onClick={() => onOpen(L.siren)}
                className="bg-white border border-gray-200 rounded-lg p-2.5 mb-2 cursor-grab text-[13px]">
                <b className="block">{L.brand || L.name}</b>
                <span className="text-xs text-gray-500">{L.commune} · {L.pack || 'Abo'} · {eur(L.deal)}</span>
                <div className="mt-1 flex items-center gap-1.5"><Prio p={L.prio} small /> <Tag tone={(SITE[L.site_status] || [])[1]}>{(SITE[L.site_status] || [])[0]}</Tag>{L.next_action ? <span className="text-xs text-gray-500">⏰ {L.next_action}</span> : null}</div>
              </div>
            )) : <div className="text-gray-400 p-2">—</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

export function DueList({ cfg, onOpen, refreshKey }: { cfg: any; onOpen: (s: string) => void; refreshKey: number }) {
  const [d, setD] = useState<any>(null)
  useEffect(() => { api(`/leads?${new URLSearchParams({ due: '1', sort: 'next', dir: 'asc', per: '200', page: '1' })}`).then(setD) }, [refreshKey])
  if (!d) return <div className="text-gray-500">Chargement…</div>
  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">Prospects dont la prochaine action est prévue aujourd&apos;hui ou en retard.</p>
      {d.items?.length ? <LeadTable compact items={d.items} effLabels={cfg.eff_labels} onOpen={onOpen} /> : <div className="card text-center text-gray-500 py-12">Aucune relance due. Planifiez des actions depuis les fiches prospects.</div>}
    </div>
  )
}
