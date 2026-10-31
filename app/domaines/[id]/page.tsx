'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fetchAdminData } from '@/lib/admin-data'
import { STADES, LABELS_STADE, prochaineAction, type Stade } from '@/lib/prospects-hm'

type Prospect = {
  id: number; slug: string; nom: string; appellation?: string; siren?: string; commune?: string; site_etat?: string
  stade: Stade; resume?: string; brouillon_email?: string; dossier?: string
}
type Evenement = { id: number; type: string; titre: string; detail?: string; created_at: string }
type Lien = { id: number; domaine?: string; nom_domaine?: string; nom?: string; statut?: string; prospect_id?: number | null }
const nomLien = (l: Lien) => l.nom_domaine || l.domaine || l.nom || `n° ${l.id}`

export default function FicheDomaine() {
  const { id } = useParams<{ id: string }>()
  const [p, setP] = useState<Prospect | null>(null)
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [leads, setLeads] = useState<Lien[]>([])
  const [clients, setClients] = useState<Lien[]>([])
  const [libresLeads, setLibresLeads] = useState<Lien[]>([])
  const [libresClients, setLibresClients] = useState<Lien[]>([])
  const [onglet, setOnglet] = useState<'resume' | 'historique'>('resume')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)

  const charger = async () => {
    const [pr, ev, le, cl, tousLeads, tousClients] = await Promise.all([
      fetchAdminData<Prospect>('prospects_hm', { id }),
      fetchAdminData<Evenement>('evenements', { eq_column: 'prospect_id', eq_value: id, order_column: 'created_at', order_asc: 'false' }),
      fetchAdminData<Lien>('leads', { eq_column: 'prospect_id', eq_value: id }),
      fetchAdminData<Lien>('clients', { eq_column: 'prospect_id', eq_value: id }),
      fetchAdminData<Lien>('leads'),
      fetchAdminData<Lien>('clients'),
    ])
    setLibresLeads(tousLeads.filter((l) => !l.prospect_id))
    setLibresClients(tousClients.filter((c) => !c.prospect_id))
    setP(pr[0] || null); setEvenements(ev); setLeads(le); setClients(cl); setLoading(false)
  }
  useEffect(() => { charger() }, [id])

  const changerStade = async (stade: Stade) => {
    await fetch('/api/prospects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: Number(id), stade }) })
    charger()
  }
  const lier = async (type: 'lead' | 'client', lienId: number, lierOk: boolean) => {
    await fetch('/api/prospects/lier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id: lienId, prospect_id: Number(id), lier: lierOk }) })
    charger()
  }
  const ajouterNote = async () => {
    if (!note.trim()) return
    await fetch('/api/evenements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prospect_id: Number(id), titre: note }) })
    setNote(''); charger()
  }

  if (loading) return <div className="container-dashboard">Chargement...</div>
  if (!p) return <div className="container-dashboard">Domaine introuvable. <Link href="/pipeline" className="text-wine">← Pipeline</Link></div>

  const etapes: Stade[] = STADES.filter((s) => s !== 'abandonne')
  const rang = etapes.indexOf(p.stade)
  const action = prochaineAction(p.stade)

  return (
    <div className="container-dashboard">
      <Link href="/pipeline" className="text-wine text-sm font-semibold hover:underline">← Pipeline</Link>
      <h1 className="text-3xl font-bold mt-2">{p.nom}</h1>
      <p className="text-gray-500 mb-4">{[p.appellation, p.commune, p.siren && `SIREN ${p.siren}`].filter(Boolean).join(' · ')}</p>

      <div className="flex flex-wrap items-center gap-2 mb-6 text-sm">
        {p.stade === 'abandonne'
          ? <span className="badge badge-danger">Abandonné</span>
          : etapes.map((s, i) => (
            <span key={s} className={`badge ${i <= rang ? 'badge-success' : 'badge-info'}`}>{i <= rang ? '●' : '○'} {LABELS_STADE[s]}</span>
          ))}
        <select value={p.stade} onChange={(e) => changerStade(e.target.value as Stade)} className="ml-auto px-2 py-1 border rounded text-sm">
          {STADES.map((x) => <option key={x} value={x}>{LABELS_STADE[x]}</option>)}
        </select>
      </div>

      {action && (
        <div className="card mb-6">
          <p className="text-xs text-gray-500 font-semibold uppercase">Prochaine action</p>
          <p className="font-medium mt-1">{action}</p>
        </div>
      )}

      <div className="flex gap-4 border-b mb-4">
        {(['resume', 'historique'] as const).map((o) => (
          <button key={o} onClick={() => setOnglet(o)} className={`pb-2 font-semibold ${onglet === o ? 'text-wine border-b-2 border-wine' : 'text-gray-500'}`}>
            {o === 'resume' ? 'Résumé' : `Historique (${evenements.length})`}
          </button>
        ))}
      </div>

      {onglet === 'resume' ? (
        <div className="card space-y-4 text-sm">
          {p.resume && <p className="whitespace-pre-wrap">{p.resume}</p>}
          {p.site_etat && <p><b>Site actuel :</b> {p.site_etat}</p>}
          <div>
            <p className="font-semibold mb-1">Rattachements</p>
            {leads.length === 0 && clients.length === 0 && <p className="text-gray-500 text-xs mb-2">Aucun lead ni client rattaché.</p>}
            {leads.map((l) => (
              <p key={`l${l.id}`} className="mb-1">Lead : {nomLien(l)} ({l.statut || '?'}) <Link href="/leads" className="text-wine text-xs ml-2">Voir</Link> <button onClick={() => lier('lead', l.id, false)} className="text-xs text-gray-500 ml-2 underline">Détacher</button></p>
            ))}
            {clients.map((c) => (
              <p key={`c${c.id}`} className="mb-1">Client : {nomLien(c)} ({c.statut || '?'}) <Link href={`/clients/${c.id}`} className="text-wine font-semibold ml-2">Ouvrir le dossier client (argent, projet, contenu) →</Link> <button onClick={() => lier('client', c.id, false)} className="text-xs text-gray-500 ml-2 underline">Détacher</button></p>
            ))}
            <div className="flex flex-wrap gap-2 mt-2">
              <select defaultValue="" onChange={(e) => { if (e.target.value) lier('lead', Number(e.target.value), true) }} className="px-2 py-1 border rounded text-xs">
                <option value="">Rattacher un lead…</option>
                {libresLeads.map((l) => <option key={l.id} value={l.id}>{nomLien(l)}</option>)}
              </select>
              <select defaultValue="" onChange={(e) => { if (e.target.value) lier('client', Number(e.target.value), true) }} className="px-2 py-1 border rounded text-xs">
                <option value="">Rattacher un client…</option>
                {libresClients.map((c) => <option key={c.id} value={c.id}>{nomLien(c)}</option>)}
              </select>
            </div>
          </div>
          {p.brouillon_email && (
            <div>
              <p className="font-semibold">Brouillon de message (non envoyé)</p>
              <pre className="whitespace-pre-wrap bg-gray-50 p-3 rounded text-xs mt-1">{p.brouillon_email}</pre>
            </div>
          )}
          {p.dossier && <p className="text-xs text-gray-500">Dossier Harness Maxxing : {p.dossier}</p>}
        </div>
      ) : (
        <div className="card space-y-3 text-sm">
          <div className="flex gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ajouterNote()} placeholder="Ajouter une note (appel, réponse, rendez-vous…)" className="flex-1 px-3 py-2 border rounded" />
            <button onClick={ajouterNote} className="px-3 py-2 bg-wine text-white rounded">Ajouter</button>
          </div>
          {evenements.length === 0 ? <p className="text-gray-500">Aucun événement pour l&apos;instant.</p> : evenements.map((e) => (
            <div key={e.id} className="border-b pb-2">
              <p className="font-medium">{e.titre} <span className="text-xs text-gray-500 font-normal">· {new Date(e.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span></p>
              {e.detail && <p className="text-xs text-gray-600 whitespace-pre-wrap">{e.detail}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
