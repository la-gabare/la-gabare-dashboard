'use client'

import { useEffect, useState } from 'react'
import { Client } from '@/lib/types'

const PRIX_PACKS: Record<string, number> = { essentiel: 1990, pro: 4490, premium: 6990 }

const FORMULES = [
  { id: '3x', nom: 'En 3 fois — 40 % commande · 30 % maquette · 30 % mise en ligne' },
  { id: '2x', nom: 'En 2 fois — 50 % commande · 50 % mise en ligne' },
  { id: '1x', nom: 'En 1 fois' },
]

interface Echeance {
  id: number
  ordre: number
  libelle: string
  montant_cents: number
  statut: string
  envoye_at: string | null
  relances: number
  paye_at: string | null
  moyen: string | null
  lien: string
}

const statuts: Record<string, [string, string]> = {
  a_venir: ['À venir', 'badge-info'],
  envoye: ['Lien envoyé', 'badge-warning'],
  virement_en_attente: ['Virement en cours', 'badge-warning'],
  paye: ['Payé', 'badge-success'],
  annule: ['Annulé', ''],
}

const euros = (c: number) => (c / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '')

export default function EcheancierPanel({ client }: { client: Client }) {
  const pack = (client.pack_site || '').toLowerCase()
  const [echeances, setEcheances] = useState<Echeance[]>([])
  const [formule, setFormule] = useState(pack === 'essentiel' ? '2x' : '3x')
  const [total, setTotal] = useState(String(PRIX_PACKS[pack] || ''))
  const [remise, setRemise] = useState('0')
  const [envoyerPremier, setEnvoyerPremier] = useState(true)
  const [occupe, setOccupe] = useState(false)

  const charger = async () => {
    const res = await fetch(`/api/echeancier?client_id=${client.id}`)
    const data = await res.json()
    setEcheances(data.echeances || [])
  }
  useEffect(() => { charger() }, [client.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const action = async (body: Record<string, unknown>, confirmation?: string) => {
    if (confirmation && !confirm(confirmation)) return
    setOccupe(true)
    try {
      const res = await fetch('/api/echeancier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) alert('Erreur : ' + data.error)
      await charger()
    } finally {
      setOccupe(false)
    }
  }

  const totalNet = Number(total || 0) * (formule === '1x' ? 1 - Number(remise || 0) / 100 : 1)
  const actives = echeances.filter((e) => e.statut !== 'annule')
  const paye = actives.filter((e) => e.statut === 'paye').reduce((s, e) => s + e.montant_cents, 0)
  const du = actives.reduce((s, e) => s + e.montant_cents, 0)

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-1">Paiement du site</h2>
      <p className="text-sm text-gray-500 mb-4">
        Le client paie par carte ou par virement depuis le lien reçu par mail. Relance automatique tous les 5 jours
        (3 fois maximum), puis tu es prévenu.
      </p>

      {actives.length === 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={formule} onChange={(e) => setFormule(e.target.value)} className="md:col-span-2 px-3 py-2 border rounded-lg text-sm">
              {FORMULES.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
            <input type="number" placeholder="Total TTC €" value={total} onChange={(e) => setTotal(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm" />
          </div>
          {formule === '1x' && (
            <label className="flex items-center gap-2 text-sm">
              Remise paiement comptant
              <input type="number" min="0" max="20" value={remise} onChange={(e) => setRemise(e.target.value)}
                className="w-20 px-2 py-1 border rounded-lg text-sm" /> %
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={envoyerPremier} onChange={(e) => setEnvoyerPremier(e.target.checked)} />
            Envoyer tout de suite le lien du premier versement au client
          </label>
          <button
            disabled={occupe || !(totalNet > 0)}
            onClick={() => action(
              { action: 'creer', client_id: client.id, formule, total: Math.round(totalNet * 100) / 100, envoyer_premier: envoyerPremier },
              envoyerPremier ? `Créer l'échéancier (${euros(Math.round(totalNet * 100))}) et envoyer le premier lien à ${client.email_contact} ?` : undefined,
            )}
            className="btn-primary disabled:opacity-50 text-sm"
          >
            {occupe ? 'Création…' : `Créer l'échéancier — ${totalNet > 0 ? euros(Math.round(totalNet * 100)) : '…'}`}
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm mb-3">
            Réglé : <strong>{euros(paye)}</strong> sur {euros(du)}
          </p>
          <div className="space-y-2">
            {actives.map((e) => {
              const [label, couleur] = statuts[e.statut] || [e.statut, '']
              return (
                <div key={e.id} className="flex flex-wrap items-center gap-3 border rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium text-sm">{e.ordre}. {e.libelle} — {euros(e.montant_cents)}</div>
                    <div className="text-xs text-gray-500">
                      {e.statut === 'paye' && `Payé le ${date(e.paye_at)}${e.moyen ? ` (${e.moyen})` : ''}`}
                      {(e.statut === 'envoye' || e.statut === 'virement_en_attente') &&
                        `Envoyé le ${date(e.envoye_at)}${e.relances ? ` · ${e.relances} relance(s)` : ''}`}
                    </div>
                  </div>
                  <span className={`badge ${couleur}`}>{label}</span>
                  {e.statut !== 'paye' && (
                    <>
                      <button disabled={occupe} onClick={() => action({ action: 'envoyer', echeance_id: e.id },
                        `${e.statut === 'a_venir' ? 'Envoyer' : 'Renvoyer'} le lien de paiement à ${client.email_contact} ?`)}
                        className="text-xs px-3 py-1 rounded bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">
                        {e.statut === 'a_venir' ? 'Envoyer le lien' : 'Relancer'}
                      </button>
                      {e.statut !== 'a_venir' && (
                        <button onClick={() => navigator.clipboard.writeText(e.lien)}
                          className="text-xs px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">Copier le lien</button>
                      )}
                      <button disabled={occupe} onClick={() => action({ action: 'marquer_paye', echeance_id: e.id },
                        'Marquer ce versement comme payé (virement reçu directement, chèque…) ?')}
                        className="text-xs px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50">Marquer payé</button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
          {paye === 0 && (
            <button disabled={occupe} onClick={async () => {
              if (!confirm('Annuler tout l\'échéancier ? Les liens déjà envoyés ne fonctionneront plus.')) return
              for (const e of actives) await action({ action: 'annuler', echeance_id: e.id })
            }} className="mt-3 text-xs text-red-600 hover:underline disabled:opacity-50">
              Annuler l&apos;échéancier
            </button>
          )}
        </>
      )}
    </div>
  )
}
