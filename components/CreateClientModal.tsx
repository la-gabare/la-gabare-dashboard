'use client'

import { useState } from 'react'
import { Lead } from '@/lib/types'

interface Props {
  lead: Lead
  onClose: () => void
  onCreated: () => void
}

const abonnementFromPack: Record<string, string> = {
  Village: 'village',
  Reserve: 'reserve',
  'Grand Cru': 'grand_cru',
}

export default function CreateClientModal({ lead, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nom_domaine: lead.domaine || '',
    email_contact: lead.email || '',
    appellation: lead.appellation || '',
    region: '',
    type_vin: '',
    abonnement: abonnementFromPack[lead.pack_demande || ''] || 'village',
    style: lead.style_visuel || '',
    points_forts: '',
    histoire: '',
    public_cible: '',
    tone_voix: '',
  })

  const handleSubmit = async () => {
    if (!form.nom_domaine || !form.email_contact) {
      alert('Nom du domaine et email requis')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          statut: 'en_attente_paiement',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert('Erreur: ' + err.error)
        return
      }
      onCreated()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: 600, width: '90%', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Créer le client — {lead.nom}</h2>
        <p className="text-sm text-gray-500 mb-4">
          Le client sera créé avec le statut &laquo; en attente de paiement &raquo;. L&apos;accès à son espace personnel
          lui sera envoyé automatiquement une fois le paiement confirmé.
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Nom du domaine *</label>
              <input
                type="text"
                value={form.nom_domaine}
                onChange={(e) => setForm({ ...form, nom_domaine: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Email de contact *</label>
              <input
                type="email"
                value={form.email_contact}
                onChange={(e) => setForm({ ...form, email_contact: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Appellation</label>
              <input
                type="text"
                value={form.appellation}
                onChange={(e) => setForm({ ...form, appellation: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Région</label>
              <input
                type="text"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Type de vin</label>
              <input
                type="text"
                value={form.type_vin}
                onChange={(e) => setForm({ ...form, type_vin: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Abonnement</label>
              <select
                value={form.abonnement}
                onChange={(e) => setForm({ ...form, abonnement: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="village">Village</option>
                <option value="reserve">Réserve</option>
                <option value="grand_cru">Grand Cru</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Style</label>
            <input
              type="text"
              value={form.style}
              onChange={(e) => setForm({ ...form, style: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">Points forts</label>
            <textarea
              value={form.points_forts}
              onChange={(e) => setForm({ ...form, points_forts: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">Histoire</label>
            <textarea
              value={form.histoire}
              onChange={(e) => setForm({ ...form, histoire: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Public cible</label>
              <input
                type="text"
                value={form.public_cible}
                onChange={(e) => setForm({ ...form, public_cible: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Tone de voix</label>
              <input
                type="text"
                value={form.tone_voix}
                onChange={(e) => setForm({ ...form, tone_voix: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Création...' : 'Créer le client'}
          </button>
        </div>
      </div>
    </div>
  )
}
