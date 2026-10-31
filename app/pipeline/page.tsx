'use client'

import { useEffect, useState } from 'react'
import { fetchAdminData } from '@/lib/admin-data'
import Link from 'next/link'
import FicheTexte from '@/components/FicheTexte'
import { STADES, LABELS_STADE as labels, type Stade } from '@/lib/prospects-hm'

type Lien = { id: number; domaine?: string; nom_domaine?: string; nom?: string; statut?: string; email?: string; prospect_id?: number | null }
const nomLien = (l: Lien) => l.nom_domaine || l.domaine || l.nom || `n° ${l.id}`

type Prospect = {
  id: number; slug: string; nom: string; appellation?: string; commune?: string; site_etat?: string
  stade: Stade; resume?: string; fiche?: string; brouillon_email?: string; dossier?: string
}

export default function Pipeline() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [leads, setLeads] = useState<Lien[]>([])
  const [clients, setClients] = useState<Lien[]>([])
  const [ouvert, setOuvert] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const charger = async () => {
    setProspects(await fetchAdminData<Prospect>('prospects_hm', { order_column: 'updated_at', order_asc: 'false' }))
    const [tousLeads, tousClients] = await Promise.all([fetchAdminData<Lien>('leads'), fetchAdminData<Lien>('clients')])
    setLeads(tousLeads); setClients(tousClients)
    setLoading(false)
  }
  useEffect(() => { charger() }, [])

  const changerStade = async (id: number, stade: Stade) => {
    await fetch('/api/prospects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, stade }) })
    charger()
  }

  const leadsLibres = leads.filter((l) => !l.prospect_id)
  const clientsLibres = clients.filter((c) => !c.prospect_id)

  if (loading) return <div className="container-dashboard">Chargement...</div>

  return (
    <div className="container-dashboard">
      <h1 className="text-3xl font-bold mb-2">Pipeline</h1>
      <p className="text-gray-500 mb-6">Les prospects sont préparés dans Harness Maxxing, puis déposés ici. Rien n&apos;est envoyé sans votre accord.</p>
      {prospects.length === 0 && <div className="card text-gray-500 text-sm">Aucun prospect déposé pour l&apos;instant.</div>}
      <div className="space-y-6">
        {STADES.filter((s) => prospects.some((p) => p.stade === s)).map((s) => (
          <div key={s}>
            <h2 className="text-lg font-bold mb-2">{labels[s]} ({prospects.filter((p) => p.stade === s).length})</h2>
            <div className="card space-y-2">
              {prospects.filter((p) => p.stade === s).map((p) => (
                <div key={p.id} className="border-b pb-2">
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => setOuvert(ouvert === p.id ? null : p.id)}>
                    <div>
                      <Link href={`/domaines/${p.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-wine hover:underline">{p.nom}</Link>
                      <p className="text-xs text-gray-500">{[p.appellation, p.commune, p.site_etat && `site : ${p.site_etat}`].filter(Boolean).join(' · ')}</p>
                    </div>
                    <select
                      value={p.stade}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => changerStade(p.id, e.target.value as Stade)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      {STADES.map((x) => <option key={x} value={x}>{labels[x]}</option>)}
                    </select>
                  </div>
                  {ouvert === p.id && (
                    <div className="mt-3 text-sm space-y-3">
                      {p.resume && <p className="whitespace-pre-wrap">{p.resume}</p>}
                      {p.fiche && <div className="bg-gray-50 p-3 rounded max-h-96 overflow-y-auto"><FicheTexte texte={p.fiche} /></div>}
                      <Link href={`/domaines/${p.id}`} className="text-wine font-semibold">Ouvrir la fiche complète →</Link>
                      {p.brouillon_email && (
                        <div>
                          <p className="font-semibold">Brouillon de message (non envoyé)</p>
                          <pre className="whitespace-pre-wrap bg-gray-50 p-3 rounded text-xs">{p.brouillon_email}</pre>
                        </div>
                      )}
                      {p.dossier && <p className="text-xs text-gray-500">Dossier Harness Maxxing : {p.dossier}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold mt-8 mb-2">Leads du formulaire non rattachés ({leadsLibres.length})</h2>
      <div className="card space-y-2 text-sm">
        {leadsLibres.length === 0 && <p className="text-gray-500">Tous les leads sont rattachés à un domaine.</p>}
        {leadsLibres.map((l) => (
          <div key={l.id} className="flex justify-between items-center border-b pb-2">
            <span>{nomLien(l)} {l.statut && <span className="badge badge-info ml-2">{l.statut}</span>}</span>
            <Link href="/leads" className="text-wine text-xs font-semibold">Voir dans Leads</Link>
          </div>
        ))}
        {leads.some((l) => l.prospect_id) && (
          <p className="text-xs text-gray-500">Les leads déjà rattachés se retrouvent dans la fiche de leur domaine : {leads.filter((l) => l.prospect_id).map((l) => (
            <Link key={l.id} href={`/domaines/${l.prospect_id}`} className="text-wine underline mr-2">{nomLien(l)}</Link>
          ))}</p>
        )}
        <Link href="/leads" className="inline-block text-wine font-semibold">Tous les leads →</Link>
      </div>

      <h2 className="text-lg font-bold mt-8 mb-2">Clients non rattachés ({clientsLibres.length})</h2>
      <div className="card space-y-2 text-sm">
        {clientsLibres.length === 0 && <p className="text-gray-500">Tous les clients sont rattachés à un domaine.</p>}
        {clientsLibres.map((c) => (
          <div key={c.id} className="flex justify-between items-center border-b pb-2">
            <span>{nomLien(c)} {c.statut && <span className="badge badge-info ml-2">{c.statut}</span>}</span>
            <Link href={`/clients/${c.id}`} className="text-wine text-xs font-semibold">Ouvrir le dossier</Link>
          </div>
        ))}
        <Link href="/clients" className="inline-block text-wine font-semibold">Tous les clients →</Link>
      </div>
    </div>
  )
}
