'use client'

import { useEffect, useState } from 'react'
import { Client } from '@/lib/types'

interface Ligne { libelle: string; detail: string; montant_ht: string }
interface Devis {
  id: number
  numero: string
  total_ttc_cents: number
  formule: string
  validite: string
  statut: string
  accepte_at: string | null
  accepte_nom: string | null
  created_at: string
  lien: string
}
type Catalogue = Record<string, { libelle: string; detail: string; prix: number }>

const FORMULES = [
  { id: '3x', nom: 'En 3 fois — 40 / 30 / 30' },
  { id: '2x', nom: 'En 2 fois — 50 / 50' },
  { id: '1x', nom: 'En 1 fois' },
]
const statuts: Record<string, [string, string]> = {
  envoye: ['Envoyé', 'badge-warning'],
  accepte: ['Accepté', 'badge-success'],
  refuse: ['Refusé', 'badge-danger'],
  annule: ['Annulé', ''],
}
const euros = (c: number) => (c / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

export default function DevisPanel({ client, onChange }: { client: Client; onChange?: () => void }) {
  const pack = (client.pack_site || '').toLowerCase()
  const [devis, setDevis] = useState<Devis[]>([])
  const [catalogue, setCatalogue] = useState<Catalogue>({})
  const [tva, setTva] = useState(20)
  const [lignes, setLignes] = useState<Ligne[]>([])
  const [formule, setFormule] = useState(pack === 'essentiel' ? '2x' : '3x')
  const [remise, setRemise] = useState('0')
  const [ouvert, setOuvert] = useState(false)
  const [occupe, setOccupe] = useState(false)

  const charger = async () => {
    const res = await fetch(`/api/devis?client_id=${client.id}`)
    const data = await res.json()
    setDevis(data.devis || [])
    setTva(Number(data.tva_pct ?? 20))
    const cat: Catalogue = data.catalogue || {}
    setCatalogue(cat)
    setLignes((l) => (l.length || !cat[pack] ? l : [{ libelle: cat[pack].libelle, detail: cat[pack].detail, montant_ht: String(cat[pack].prix) }]))
  }
  useEffect(() => { charger() }, [client.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const ajouter = (cle: string) => {
    const c = catalogue[cle]
    setLignes([...lignes, c ? { libelle: c.libelle, detail: c.detail, montant_ht: String(c.prix) } : { libelle: '', detail: '', montant_ht: '' }])
  }
  const maj = (i: number, champ: keyof Ligne, v: string) => setLignes(lignes.map((l, j) => (j === i ? { ...l, [champ]: v } : l)))

  const brut = lignes.reduce((s, l) => s + (Number(l.montant_ht) || 0), 0)
  const ht = brut * (formule === '1x' ? 1 - (Number(remise) || 0) / 100 : 1)
  const ttc = ht * (1 + tva / 100)

  const action = async (body: Record<string, unknown>, confirmation: string) => {
    if (!confirm(confirmation)) return
    setOccupe(true)
    try {
      const res = await fetch('/api/devis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) alert('Erreur : ' + data.error)
      else if (body.action === 'creer') setOuvert(false)
      await charger()
      onChange?.()
    } finally {
      setOccupe(false)
    }
  }

  const enCours = devis.find((d) => d.statut === 'envoye' || d.statut === 'accepte')

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold">Devis</h2>
        {!ouvert && <button onClick={() => setOuvert(true)} className="btn-primary text-sm">Nouveau devis</button>}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Le client reçoit le devis par mail, l&apos;accepte en ligne avec les CGV, puis arrive directement sur le paiement de l&apos;acompte.
        L&apos;échéancier se crée tout seul.
      </p>

      {ouvert && (
        <div className="space-y-3 mb-5 border rounded-lg p-3">
          {enCours && <p className="text-sm text-yellow-700">Un devis {enCours.statut === 'accepte' ? 'accepté' : 'en attente'} existe déjà ({enCours.numero}).</p>}
          {lignes.map((l, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <input className="md:col-span-3 px-2 py-1 border rounded text-sm" placeholder="Prestation" value={l.libelle} onChange={(e) => maj(i, 'libelle', e.target.value)} />
              <input className="md:col-span-6 px-2 py-1 border rounded text-sm" placeholder="Détail" value={l.detail} onChange={(e) => maj(i, 'detail', e.target.value)} />
              <input className="md:col-span-2 px-2 py-1 border rounded text-sm" type="number" placeholder="€ HT" value={l.montant_ht} onChange={(e) => maj(i, 'montant_ht', e.target.value)} />
              <button className="text-xs text-red-600" onClick={() => setLignes(lignes.filter((_, j) => j !== i))}>Retirer</button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(catalogue).map(([k, c]) => (
              <button key={k} onClick={() => ajouter(k)} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">+ {c.libelle}</button>
            ))}
            <button onClick={() => ajouter('')} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">+ Ligne libre</button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <select value={formule} onChange={(e) => setFormule(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              {FORMULES.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
            {formule === '1x' && (
              <label className="flex items-center gap-2">Remise comptant
                <input type="number" min="0" max="30" value={remise} onChange={(e) => setRemise(e.target.value)} className="w-16 px-2 py-1 border rounded" /> %
              </label>
            )}
            <span className="ml-auto">
              Total HT <strong>{euros(Math.round(ht * 100))}</strong>
              {tva > 0 ? <> · TTC <strong>{euros(Math.round(ttc * 100))}</strong></> : ' (TVA non applicable)'}
            </span>
          </div>
          <div className="flex gap-2">
            <button disabled={occupe || !(ht > 0)} className="btn-primary text-sm disabled:opacity-50"
              onClick={() => action({
                action: 'creer', client_id: client.id, formule, remise_pct: Number(remise) || 0,
                lignes: lignes.map((l) => ({ libelle: l.libelle, detail: l.detail, montant_ht: Number(l.montant_ht) })),
              }, `Envoyer le devis (${euros(Math.round(ttc * 100))}) à ${client.email_contact} ?`)}>
              {occupe ? 'Envoi…' : 'Envoyer le devis au client'}
            </button>
            <button onClick={() => setOuvert(false)} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm">Fermer</button>
          </div>
        </div>
      )}

      {devis.length === 0 ? (
        <p className="text-sm text-gray-400">Aucun devis pour ce client.</p>
      ) : (
        <div className="space-y-2">
          {devis.map((d) => {
            const [label, couleur] = statuts[d.statut] || [d.statut, '']
            return (
              <div key={d.id} className="flex flex-wrap items-center gap-3 border rounded-lg px-3 py-2">
                <div className="flex-1 min-w-[200px] text-sm">
                  <div className="font-medium">{d.numero} — {euros(d.total_ttc_cents)} · {FORMULES.find((f) => f.id === d.formule)?.nom}</div>
                  <div className="text-xs text-gray-500">
                    Émis le {new Date(d.created_at).toLocaleDateString('fr-FR')}
                    {d.statut === 'accepte' && d.accepte_at ? ` · accepté le ${new Date(d.accepte_at).toLocaleDateString('fr-FR')} par ${d.accepte_nom}` : ` · valable jusqu'au ${new Date(d.validite).toLocaleDateString('fr-FR')}`}
                  </div>
                </div>
                <span className={`badge ${couleur}`}>{label}</span>
                <a href={d.lien} target="_blank" rel="noopener" className="text-xs px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">Voir</a>
                {d.statut === 'envoye' && (
                  <>
                    <button disabled={occupe} onClick={() => action({ action: 'renvoyer', devis_id: d.id }, `Renvoyer le devis à ${client.email_contact} ?`)}
                      className="text-xs px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">Renvoyer</button>
                    <button disabled={occupe} onClick={() => action({ action: 'annuler', devis_id: d.id }, 'Annuler ce devis ? Le lien ne permettra plus de l\'accepter.')}
                      className="text-xs text-red-600 hover:underline">Annuler</button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
