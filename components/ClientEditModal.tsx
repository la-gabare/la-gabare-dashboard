'use client'

import { useState } from 'react'
import { Client } from '@/lib/types'

interface ClientEditModalProps {
  client: Client | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedClient: Client) => void
}

const statutOptions = ['en_attente_paiement', 'actif', 'inactif']
const abonnementOptions = ['village', 'reserve', 'grand_cru']

export default function ClientEditModal({ client, isOpen, onClose, onSave }: ClientEditModalProps) {
  const [baseData, setBaseData] = useState<any>({
    nom_domaine: client?.nom_domaine || '',
    appellation: client?.appellation || '',
    region: client?.region || '',
    email_contact: client?.email_contact || '',
    type_vin: client?.type_vin || '',
    style: client?.style || '',
    public_cible: client?.public_cible || '',
    tone_voix: client?.tone_voix || '',
    points_forts: client?.points_forts || '',
    cepages: (client?.cepages || []).join(', '),
    statut: client?.statut || '',
    abonnement: client?.abonnement || '',
  })
  const [formData, setFormData] = useState<any>(client?.profil_client_complet || {})
  const [isSaving, setIsSaving] = useState(false)

  if (!client || !isOpen) return null

  const handleBaseChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setBaseData({ ...baseData, [name]: value })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleArrayChange = (field: string, index: number, value: string) => {
    const arr = formData[field] || []
    arr[index] = value
    setFormData({ ...formData, [field]: arr })
  }

  const addArrayItem = (field: string) => {
    const arr = formData[field] || []
    arr.push('')
    setFormData({ ...formData, [field]: arr })
  }

  const removeArrayItem = (field: string, index: number) => {
    const arr = formData[field] || []
    arr.splice(index, 1)
    setFormData({ ...formData, [field]: arr })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...baseData,
          cepages: baseData.cepages
            ? baseData.cepages.split(',').map((c: string) => c.trim()).filter(Boolean)
            : [],
          profil_client_complet: formData,
        }),
      })

      if (res.ok) {
        const updated = await res.json()
        onSave(updated)
        onClose()
      } else {
        alert('Erreur sauvegarde')
      }
    } catch (err) {
      alert('Erreur')
    }
    setIsSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold mb-6">{client.nom_domaine} - Édition</h2>

        <div className="space-y-6">
          {/* INFORMATIONS GÉNÉRALES */}
          <div>
            <label className="block text-sm font-semibold mb-2">Informations générales</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                name="nom_domaine"
                placeholder="Nom du domaine"
                value={baseData.nom_domaine}
                onChange={handleBaseChange}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="text"
                name="appellation"
                placeholder="Appellation"
                value={baseData.appellation}
                onChange={handleBaseChange}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="text"
                name="region"
                placeholder="Région"
                value={baseData.region}
                onChange={handleBaseChange}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="email"
                name="email_contact"
                placeholder="Email de contact"
                value={baseData.email_contact}
                onChange={handleBaseChange}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="text"
                name="type_vin"
                placeholder="Type de vin"
                value={baseData.type_vin}
                onChange={handleBaseChange}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="text"
                name="style"
                placeholder="Style"
                value={baseData.style}
                onChange={handleBaseChange}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="text"
                name="public_cible"
                placeholder="Public cible"
                value={baseData.public_cible}
                onChange={handleBaseChange}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="text"
                name="tone_voix"
                placeholder="Tone de voix"
                value={baseData.tone_voix}
                onChange={handleBaseChange}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="text"
                name="cepages"
                placeholder="Cépages (séparés par des virgules)"
                value={baseData.cepages}
                onChange={handleBaseChange}
                className="px-3 py-2 border rounded-lg text-sm col-span-2"
              />
              <select
                name="statut"
                value={baseData.statut}
                onChange={handleBaseChange}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Statut</option>
                {statutOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                name="abonnement"
                value={baseData.abonnement}
                onChange={handleBaseChange}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Abonnement</option>
                {abonnementOptions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <textarea
              name="points_forts"
              placeholder="Points forts"
              value={baseData.points_forts}
              onChange={handleBaseChange}
              className="w-full px-3 py-2 border rounded-lg text-sm mt-2"
              rows={2}
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="block text-sm font-semibold mb-2">Description longue</label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
              placeholder="Description détaillée du domaine..."
            />
          </div>

          {/* HISTOIRE */}
          <div>
            <label className="block text-sm font-semibold mb-2">Histoire & Valeurs</label>
            <textarea
              name="histoire"
              value={formData.histoire || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
              placeholder="Histoire, valeurs, mission du domaine..."
            />
          </div>

          {/* EMPLOYÉS */}
          <div>
            <label className="block text-sm font-semibold mb-2">Employés & Équipe</label>
            {(formData.employes || []).map((emp: any, idx: number) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Nom"
                  value={emp.nom || ''}
                  onChange={(e) => handleArrayChange('employes', idx, e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="text"
                  placeholder="Rôle"
                  value={emp.role || ''}
                  onChange={(e) => {
                    const arr = formData.employes || []
                    arr[idx] = { ...arr[idx], role: e.target.value }
                    setFormData({ ...formData, employes: arr })
                  }}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <button
                  onClick={() => removeArrayItem('employes', idx)}
                  className="px-3 py-2 bg-red-500 text-white rounded text-sm"
                >
                  Supprimer
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem('employes')}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded text-sm"
            >
              + Ajouter employé
            </button>
          </div>

          {/* CUVÉES */}
          <div>
            <label className="block text-sm font-semibold mb-2">Cuvées</label>
            {(formData.cuvees || []).map((cuvee: any, idx: number) => (
              <div key={idx} className="border p-3 rounded-lg mb-2">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Nom de cuvée"
                    value={cuvee.nom || ''}
                    onChange={(e) => {
                      const arr = formData.cuvees || []
                      arr[idx] = { ...arr[idx], nom: e.target.value }
                      setFormData({ ...formData, cuvees: arr })
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  <button
                    onClick={() => removeArrayItem('cuvees', idx)}
                    className="px-3 py-2 bg-red-500 text-white rounded text-sm"
                  >
                    Supprimer
                  </button>
                </div>
                <textarea
                  placeholder="Caractéristiques, goût, parcelles..."
                  value={cuvee.caracteristiques || ''}
                  onChange={(e) => {
                    const arr = formData.cuvees || []
                    arr[idx] = { ...arr[idx], caracteristiques: e.target.value }
                    setFormData({ ...formData, cuvees: arr })
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={2}
                />
              </div>
            ))}
            <button
              onClick={() => addArrayItem('cuvees')}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded text-sm"
            >
              + Ajouter cuvée
            </button>
          </div>

          {/* PARCELLES */}
          <div>
            <label className="block text-sm font-semibold mb-2">Parcelles</label>
            {(formData.parcelles || []).map((parc: any, idx: number) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Nom parcelle"
                  value={parc.nom || ''}
                  onChange={(e) => {
                    const arr = formData.parcelles || []
                    arr[idx] = { ...arr[idx], nom: e.target.value }
                    setFormData({ ...formData, parcelles: arr })
                  }}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="text"
                  placeholder="Exposition/Type"
                  value={parc.exposition || ''}
                  onChange={(e) => {
                    const arr = formData.parcelles || []
                    arr[idx] = { ...arr[idx], exposition: e.target.value }
                    setFormData({ ...formData, parcelles: arr })
                  }}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <button
                  onClick={() => removeArrayItem('parcelles', idx)}
                  className="px-3 py-2 bg-red-500 text-white rounded text-sm"
                >
                  Supprimer
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem('parcelles')}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded text-sm"
            >
              + Ajouter parcelle
            </button>
          </div>

          {/* AUTRES NOTES */}
          <div>
            <label className="block text-sm font-semibold mb-2">Notes supplémentaires</label>
            <textarea
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
              placeholder="Toute autre information utile..."
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-green-500 text-white rounded font-semibold hover:bg-green-600 disabled:bg-gray-400"
          >
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
