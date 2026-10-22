'use client'

import { useState } from 'react'
import { Client, Lead } from '@/lib/types'

interface Props {
  lead?: Lead // absent : création directe depuis la page Clients
  brief?: Record<string, unknown> | null
  onClose: () => void
  onCreated: (client: Client) => void
}

const sansAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// Le lead porte le pack SITE demandé (Essentiel / Pro / Premium) ; l'abonnement n'apparaît que dans l'audit
function packSiteDe(lead: Partial<Lead>): string {
  const p = sansAccents(lead.pack_demande || '')
  return ['essentiel', 'pro', 'premium'].find((k) => p.includes(k)) || ''
}

function abonnementDe(lead: Partial<Lead>): string {
  const t = sansAccents(`${lead.pack_demande || ''} ${lead.message || ''}`)
  if (t.includes('grand cru')) return 'grand_cru'
  if (t.includes('reserve')) return 'reserve'
  return 'village'
}

// Nom de domaine web (sans https:// ni www.) à partir de l'URL du site actuel
function domaineWeb(url: unknown): string {
  const u = String(url || '').trim()
  if (!u) return ''
  try {
    return new URL(u.startsWith('http') ? u : `https://${u}`).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

const cibles: [string, string][] = [
  ['cible_particuliers', 'particuliers'], ['cible_cavistes', 'cavistes'], ['cible_restaurants', 'restaurants'],
  ['cible_export', 'export'], ['cible_professionnels', 'professionnels'],
]

export default function CreateClientModal({ lead: leadSource, brief, onClose, onCreated }: Props) {
  const lead: Partial<Lead> = leadSource || {}
  const [loading, setLoading] = useState(false)
  const b = (k: string) => (brief?.[k] ? String(brief[k]) : '')
  const [form, setForm] = useState({
    nom_domaine: lead.domaine || b('nom_domaine'),
    email_contact: lead.email || b('email'),
    appellation: lead.appellation || b('appellation'),
    region: '',
    type_vin: '',
    pack_site: packSiteDe(lead),
    domaine: domaineWeb(lead.url || brief?.site_url),
    abonnement: abonnementDe(lead),
    style: lead.style_visuel || b('style_visuel'),
    points_forts: b('positionnement'),
    histoire: b('presentation'),
    public_cible: cibles.filter(([k]) => brief?.[k] === true).map(([, l]) => l).join(', '),
    tone_voix: b('messages_cles'),
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
          pack_site: form.pack_site || null,
          domaine: form.domaine || null,
          site_url: form.domaine ? `https://${form.domaine}` : null,
          statut: 'en_attente_paiement',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert('Erreur: ' + err.error)
        return
      }
      onCreated(await res.json())
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
        <h2 className="text-xl font-bold mb-4">{leadSource ? `Créer le client — ${leadSource.nom}` : 'Nouveau client'}</h2>
        <p className="text-sm text-gray-500 mb-4">
          Le client sera créé avec le statut &laquo; en attente de paiement &raquo;. L&apos;accès à son espace personnel
          lui sera envoyé automatiquement une fois le paiement confirmé.
          {brief && ' Les champs ont été pré-remplis avec son brief détaillé.'}
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
              <label className="text-xs text-gray-500">Pack site</label>
              <select
                value={form.pack_site}
                onChange={(e) => setForm({ ...form, pack_site: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Aucun (abonnement seul)</option>
                <option value="essentiel">Essentiel</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Nom de domaine du site</label>
              <input
                type="text"
                placeholder="domaine-exemple.fr"
                value={form.domaine}
                onChange={(e) => setForm({ ...form, domaine: domaineWeb(e.target.value) || e.target.value.trim() })}
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
            {loading ? 'Création...' : leadSource ? 'Créer le client et préparer le devis' : 'Créer le client'}
          </button>
        </div>
      </div>
    </div>
  )
}
