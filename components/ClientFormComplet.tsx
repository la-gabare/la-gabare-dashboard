'use client'

import { useState } from 'react'
import { Client } from '@/lib/types'

interface ClientFormCompletProps {
  client: Client
  onSave: (updated: Client) => void
}

export function ClientEditFormInline({ client, onSave }: ClientFormCompletProps) {
  const [formData, setFormData] = useState<any>(client?.profil_client_complet || {})
  const [isSaving, setIsSaving] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profil_client_complet: formData,
        }),
      })

      if (res.ok) {
        const updated = await res.json()
        onSave(updated)
      } else {
        alert('Erreur sauvegarde')
      }
    } catch (err) {
      alert('Erreur')
    }
    setIsSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block font-semibold mb-1">Slogan</label>
          <input
            type="text"
            name="slogan"
            value={formData.slogan || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Remarques</label>
          <input
            type="text"
            name="remarques"
            value={formData.remarques || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block font-semibold mb-1">Telephone</label>
          <input
            type="text"
            name="telephone"
            value={formData.telephone || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Nom Contact</label>
          <input
            type="text"
            name="nom_contact"
            value={formData.nom_contact || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block font-semibold mb-1">Presentation</label>
        <textarea
          name="presentation"
          value={formData.presentation || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-lg"
          rows={4}
        />
      </div>

      <div>
        <label className="block font-semibold mb-1">Blog Souhaite</label>
        <input
          type="text"
          name="blog_souhaite"
          value={formData.blog_souhaite || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      <div>
        <label className="block font-semibold mb-1">Messages Cles</label>
        <textarea
          name="messages_cles"
          value={formData.messages_cles || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-lg"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block font-semibold mb-1">Site Existant</label>
          <input
            type="text"
            name="site_existant"
            value={formData.site_existant || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Certifications</label>
          <input
            type="text"
            name="certifications"
            value={formData.certifications || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block font-semibold mb-1">Kpis Importants</label>
        <textarea
          name="kpis_importants"
          value={formData.kpis_importants || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-lg"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block font-semibold mb-1">Positionnement</label>
          <input
            type="text"
            name="positionnement"
            value={formData.positionnement || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Cible Principale</label>
          <input
            type="text"
            name="cible_principale"
            value={formData.cible_principale || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block font-semibold mb-1">Contenu Existant</label>
        <textarea
          name="contenu_existant"
          value={formData.contenu_existant || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-lg"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block font-semibold mb-1">Instagram Handle</label>
          <input
            type="text"
            name="instagram_handle"
            value={formData.instagram_handle || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Disponibilite Rdv</label>
          <input
            type="text"
            name="disponibilite_rdv"
            value={formData.disponibilite_rdv || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block font-semibold mb-1">Photos Disponibles</label>
        <textarea
          name="photos_disponibles"
          value={formData.photos_disponibles || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-lg"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block font-semibold mb-1">Conformite Loi Evin</label>
          <input
            type="text"
            name="conformite_loi_evin"
            value={formData.conformite_loi_evin || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Fonction Contact</label>
          <input
            type="text"
            name="fonction_contact"
            value={formData.fonction_contact || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block font-semibold mb-1">Objectifs Principaux</label>
          <textarea
            name="objectifs_principaux"
            value={formData.objectifs_principaux || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            rows={2}
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Urgence Timeline</label>
          <input
            type="text"
            name="urgence_timeline"
            value={formData.urgence_timeline || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block font-semibold mb-1">Style Visuel Prefere</label>
          <input
            type="text"
            name="style_visuel_prefere"
            value={formData.style_visuel_prefere || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Cuvees Principales</label>
          <input
            type="text"
            name="cuvees_principales"
            value={formData.cuvees_principales || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block font-semibold mb-1">Qui Approuve Decisions</label>
          <input
            type="text"
            name="qui_approuve_decisions"
            value={formData.qui_approuve_decisions || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Qui Gere Communication</label>
          <input
            type="text"
            name="qui_gere_communication"
            value={formData.qui_gere_communication || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block font-semibold mb-1">Type Site Souhaite</label>
          <input
            type="text"
            name="type_site_souhaite"
            value={formData.type_site_souhaite || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Couleurs Souhaitees</label>
          <input
            type="text"
            name="couleurs_souhaitees"
            value={formData.couleurs_souhaitees || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block font-semibold mb-1">Reseaux Prioritaires</label>
          <textarea
            name="reseaux_prioritaires"
            value={formData.reseaux_prioritaires || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            rows={2}
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Frequence Publication</label>
          <input
            type="text"
            name="frequence_publication"
            value={formData.frequence_publication || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block font-semibold mb-1">Budget Solution Digitale</label>
          <input
            type="text"
            name="budget_solution_digitale"
            value={formData.budget_solution_digitale || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Budget Annuel Communication</label>
          <input
            type="text"
            name="budget_annuel_communication"
            value={formData.budget_annuel_communication || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block font-semibold mb-1">Resultat Mesurable 12 Mois</label>
        <textarea
          name="resultat_mesurable_12mois"
          value={formData.resultat_mesurable_12mois || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-lg"
          rows={2}
        />
      </div>

      <div>
        <label className="block font-semibold mb-1">Concurrents Inspirations</label>
        <textarea
          name="concurrents_inspirations"
          value={formData.concurrents_inspirations || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-lg"
          rows={2}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full px-4 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 disabled:opacity-50"
      >
        {isSaving ? '💾 Sauvegarde...' : '💾 Sauvegarder'}
      </button>
    </div>
  )
}

export function ClientProfileDisplay({ client }: { client: Client }) {
  const data = (client?.profil_client_complet || {}) as Record<string, any>

  return (
    <div className="grid grid-cols-2 gap-6">
      <div><strong>Slogan:</strong> <span className="text-gray-700">{data.slogan || '-'}</span></div>
      <div><strong>Remarques:</strong> <span className="text-gray-700">{data.remarques || '-'}</span></div>
      <div><strong>Telephone:</strong> <span className="text-gray-700">{data.telephone || '-'}</span></div>
      <div><strong>Nom Contact:</strong> <span className="text-gray-700">{data.nom_contact || '-'}</span></div>
      <div className="col-span-2"><strong>Presentation:</strong> <p className="text-gray-700 mt-1">{data.presentation || '-'}</p></div>
      <div><strong>Blog Souhaite:</strong> <span className="text-gray-700">{data.blog_souhaite || '-'}</span></div>
      <div className="col-span-2"><strong>Messages Cles:</strong> <p className="text-gray-700 mt-1">{data.messages_cles || '-'}</p></div>
      <div><strong>Site Existant:</strong> <span className="text-gray-700">{data.site_existant || '-'}</span></div>
      <div><strong>Certifications:</strong> <span className="text-gray-700">{data.certifications || '-'}</span></div>
      <div className="col-span-2"><strong>Kpis Importants:</strong> <p className="text-gray-700 mt-1">{data.kpis_importants || '-'}</p></div>
      <div><strong>Positionnement:</strong> <span className="text-gray-700">{data.positionnement || '-'}</span></div>
      <div><strong>Cible Principale:</strong> <span className="text-gray-700">{data.cible_principale || '-'}</span></div>
      <div className="col-span-2"><strong>Reseaux Prioritaires:</strong> <p className="text-gray-700 mt-1">{data.reseaux_prioritaires || '-'}</p></div>
      <div><strong>Frequence Publication:</strong> <span className="text-gray-700">{data.frequence_publication || '-'}</span></div>
      <div><strong>Budget Annuel:</strong> <span className="text-gray-700">{data.budget_annuel_communication || '-'}</span></div>
    </div>
  )
}
