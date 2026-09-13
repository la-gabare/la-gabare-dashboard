'use client'

import { useState } from 'react'
import { Lead } from '@/lib/types'

interface Props {
  lead: Lead
  onClose: () => void
  onCreated: () => void
}

export default function CreateCahierModal({ lead, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    pack_choisi: lead.pack_demande?.startsWith('Pack') ? lead.pack_demande : 'Pack Essentiel',
    nom_domaine: lead.domaine || '',
    appellation: lead.appellation || '',
    slogan: lead.slogan || '',
    style_visuel: lead.style_visuel || '',
    couleurs_souhaitees: lead.couleurs_souhaitees || '',
    lien_photos: '',
    liste_cuvees: lead.liste_cuvees || '',
    nom_contact: lead.nom || '',
    telephone: lead.tel || '',
    email: lead.email || '',
    remarques_prompt: '',
  })

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cahier-des-charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, traite: false, consent_cgv: true }),
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
        <h2 className="text-xl font-bold mb-4">Créer le cahier des charges — {lead.nom}</h2>
        <p className="text-sm text-gray-500 mb-4">Complète avec les infos récoltées pendant le RDV.</p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Pack choisi</label>
              <select
                value={form.pack_choisi}
                onChange={(e) => setForm({ ...form, pack_choisi: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="Pack Essentiel">Pack Essentiel</option>
                <option value="Pack Pro">Pack Pro</option>
                <option value="Pack Premium">Pack Premium</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Nom du domaine</label>
              <input
                type="text"
                value={form.nom_domaine}
                onChange={(e) => setForm({ ...form, nom_domaine: e.target.value })}
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
              <label className="text-xs text-gray-500">Slogan</label>
              <input
                type="text"
                value={form.slogan}
                onChange={(e) => setForm({ ...form, slogan: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Style visuel</label>
              <input
                type="text"
                value={form.style_visuel}
                onChange={(e) => setForm({ ...form, style_visuel: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Couleurs souhaitées</label>
              <input
                type="text"
                value={form.couleurs_souhaitees}
                onChange={(e) => setForm({ ...form, couleurs_souhaitees: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Lien vers les photos</label>
            <input
              type="text"
              value={form.lien_photos}
              onChange={(e) => setForm({ ...form, lien_photos: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">Liste des cuvées</label>
            <input
              type="text"
              value={form.liste_cuvees}
              onChange={(e) => setForm({ ...form, liste_cuvees: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">Contact</label>
              <input
                type="text"
                value={form.nom_contact}
                onChange={(e) => setForm({ ...form, nom_contact: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Téléphone</label>
              <input
                type="text"
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Remarques (notes du RDV)</label>
            <textarea
              value={form.remarques_prompt}
              onChange={(e) => setForm({ ...form, remarques_prompt: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Création...' : 'Créer le cahier des charges'}
          </button>
        </div>
      </div>
    </div>
  )
}
