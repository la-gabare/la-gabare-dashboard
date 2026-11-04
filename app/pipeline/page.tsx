'use client'

import { useEffect, useState } from 'react'
import { fetchAdminData } from '@/lib/admin-data'
import Link from 'next/link'
import FicheTexte from '@/components/FicheTexte'
import MaquetteApercu from '@/components/MaquetteApercu'
import ConvertirProspect from '@/components/ConvertirProspect'
import { STADES, ETAPES_PUSH, LABELS_STADE as labels, peutDevenirClient, type Stade } from '@/lib/prospects-hm'

type Lead = { id: number; domaine?: string; nom?: string; statut?: string; type_demande?: string; created_at?: string; prospect_id?: number | null }
type Prospect = {
  id: number; slug: string; nom: string; appellation?: string; commune?: string; site_etat?: string
  stade: Stade; resume?: string; fiche?: string; brouillon_email?: string; dossier?: string; maquette_url?: string
}

// Pull : le vigneron vient à nous (site, audit, formulaire). Même parcours que dans « Leads ».
const ETAPES_PULL: [string, string][] = [
  ['reception', 'Réception'], ['mail_envoye', 'Mail envoyé'], ['relance', 'Relancé'],
  ['rdv_pris', 'RDV pris'], ['formulaire_complete', 'Formulaire complété'], ['client', 'Devenu client'],
]

export default function Pipeline() {
  const [mode, setMode] = useState<'pull' | 'push'>('push')
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [ouvert, setOuvert] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const charger = async () => {
    setProspects(await fetchAdminData<Prospect>('prospects_hm', { order_column: 'updated_at', order_asc: 'false' }))
    setLeads(await fetchAdminData<Lead>('leads'))
    setLoading(false)
  }
  useEffect(() => { charger() }, [])

  const changerStade = async (id: number, stade: Stade) => {
    await fetch('/api/prospects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, stade }) })
    charger()
  }

  if (loading) return <div className="container-dashboard">Chargement...</div>

  // « A répondu » (ancien stade) est regroupé avec « Contacté »
  const etape = (p: Prospect): Stade => (p.stade === 'repondu' ? 'contacte' : p.stade)
  const abandonnes = prospects.filter((p) => p.stade === 'abandonne')
  const leadsActifs = leads.filter((l) => l.statut !== 'archive')
  const nbPush = prospects.filter((p) => p.stade !== 'abandonne' && p.stade !== 'client').length
  const nbPull = leadsActifs.filter((l) => (l.statut || 'reception') !== 'client').length

  const onglet = (m: 'pull' | 'push', titre: string, aide: string, n: number) => (
    <button onClick={() => setMode(m)} className={`text-left px-4 py-3 rounded-lg border ${mode === m ? 'border-wine bg-white shadow-sm' : 'border-transparent text-gray-500'}`}>
      <span className="font-bold block">{titre} ({n})</span>
      <span className="text-xs">{aide}</span>
    </button>
  )

  return (
    <div className="container-dashboard">
      <h1 className="text-3xl font-bold mb-2">Pipeline</h1>
      <p className="text-gray-500 mb-4">Deux façons d&apos;obtenir un client. Dans les deux cas, la suite est la même : client créé, devis payé, premier jet du site, 2e paiement, publication, dernier paiement. Rien n&apos;est envoyé sans votre accord.</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {onglet('push', 'Push — nous cherchons', 'Harness Maxxing cherche, prépare la maquette, vous contactez', nbPush)}
        {onglet('pull', 'Pull — ils nous trouvent', 'Audit ou formulaire sur le site la-gabare.fr', nbPull)}
      </div>

      {mode === 'push' ? (
        <>
          <p className="text-sm text-gray-500 mb-4">
            Recherche (Harness Maxxing) → maquette du site → vous contactez le vigneron → il accepte → <b>Client + devis</b>.
          </p>
          {prospects.length === 0 && <div className="card text-gray-500 text-sm">Aucun prospect déposé pour l&apos;instant.</div>}
          <div className="space-y-6">
            {ETAPES_PUSH.map((s) => {
              const liste = prospects.filter((p) => etape(p) === s)
              if (liste.length === 0) return null
              return (
                <div key={s}>
                  <h2 className="text-lg font-bold mb-2">{labels[s]} ({liste.length})</h2>
                  <div className="card space-y-2">
                    {liste.map((p) => (
                      <div key={p.id} className="border-b pb-2">
                        <div className="flex justify-between items-center gap-2 cursor-pointer" onClick={() => setOuvert(ouvert === p.id ? null : p.id)}>
                          <div>
                            <Link href={`/domaines/${p.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-wine hover:underline">{p.nom}</Link>
                            <p className="text-xs text-gray-500">{[p.appellation, p.commune, p.site_etat && `site : ${p.site_etat}`].filter(Boolean).join(' · ')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {p.maquette_url && (
                              <a href={p.maquette_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-wine font-semibold underline">Maquette</a>
                            )}
                            {peutDevenirClient(p.stade) && <ConvertirProspect prospect={p} />}
                            <select
                              value={p.stade}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => changerStade(p.id, e.target.value as Stade)}
                              className="px-2 py-1 border rounded text-sm"
                            >
                              {STADES.filter((x) => x !== 'repondu' || p.stade === 'repondu').map((x) => <option key={x} value={x}>{labels[x]}</option>)}
                            </select>
                          </div>
                        </div>
                        {ouvert === p.id && (
                          <div className="mt-3 text-sm space-y-3">
                            {p.resume && <p className="whitespace-pre-wrap">{p.resume}</p>}
                            <MaquetteApercu url={p.maquette_url} />
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
              )
            })}
            {abandonnes.length > 0 && (
              <p className="text-xs text-gray-500">Abandonnés ({abandonnes.length}) : {abandonnes.map((p) => (
                <Link key={p.id} href={`/domaines/${p.id}`} className="text-wine underline mr-2">{p.nom}</Link>
              ))}</p>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            Audit gratuit ou formulaire → mail → rendez-vous / brief → <b>Client + devis</b> (bouton dans <Link href="/leads" className="text-wine underline">Leads</Link>).
          </p>
          {leadsActifs.length === 0 && <div className="card text-gray-500 text-sm">Aucun lead pour l&apos;instant.</div>}
          <div className="space-y-6">
            {ETAPES_PULL.map(([statut, libelle]) => {
              const liste = leadsActifs.filter((l) => (l.statut || 'reception') === statut)
              if (liste.length === 0) return null
              return (
                <div key={statut}>
                  <h2 className="text-lg font-bold mb-2">{libelle} ({liste.length})</h2>
                  <div className="card space-y-2 text-sm">
                    {liste.map((l) => (
                      <div key={l.id} className="flex justify-between items-center border-b pb-2">
                        <span>
                          {l.domaine || l.nom || `n° ${l.id}`}
                          {l.type_demande && <span className="badge badge-info ml-2">{l.type_demande === 'audit' ? 'Audit' : l.type_demande === 'abonnement' ? 'Abonnement seul' : 'Site'}</span>}
                        </span>
                        {l.prospect_id
                          ? <Link href={`/domaines/${l.prospect_id}`} className="text-wine text-xs font-semibold">Fiche du domaine</Link>
                          : <Link href="/leads" className="text-wine text-xs font-semibold">Voir dans Leads</Link>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
