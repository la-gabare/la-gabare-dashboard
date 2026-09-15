'use client'

import { useEffect, useState } from 'react'
import { fetchAdminData } from '@/lib/admin-data'
import { Tache, Client } from '@/lib/types'
import { Trash2, Plus } from 'lucide-react'

const statuts = ['a_faire', 'en_cours', 'terminee']
const priorites = ['basse', 'normale', 'haute']

const statutLabels: Record<string, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  terminee: 'Terminée',
}

const prioriteLabels: Record<string, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
}

const prioriteBadge: Record<string, string> = {
  basse: 'badge-info',
  normale: 'badge-warning',
  haute: 'badge-danger',
}

export default function TachesPage() {
  const [taches, setTaches] = useState<Tache[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'toutes' | 'a_faire' | 'en_cours' | 'terminee'>('toutes')
  const [form, setForm] = useState({
    titre: '',
    description: '',
    priorite: 'normale',
    deadline: '',
    client_id: '',
  })

  const fetchData = async () => {
    setLoading(true)
    const [tachesData, clientsData] = await Promise.all([
      fetchAdminData<Tache>('taches', { order_column: 'created_at', order_asc: 'false' }),
      fetchAdminData<Client>('clients', { order_column: 'nom_domaine' }),
    ])
    setTaches(tachesData)
    setClients(clientsData)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const createTache = async () => {
    if (!form.titre) {
      alert('Le titre est requis')
      return
    }
    const res = await fetch('/api/taches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre: form.titre,
        description: form.description || null,
        priorite: form.priorite,
        deadline: form.deadline || null,
        client_id: form.client_id ? parseInt(form.client_id) : null,
        statut: 'a_faire',
      }),
    })
    if (res.ok) {
      setForm({ titre: '', description: '', priorite: 'normale', deadline: '', client_id: '' })
      setShowForm(false)
      fetchData()
    } else {
      const err = await res.json()
      alert('Erreur: ' + err.error)
    }
  }

  const updateStatut = async (id: number, statut: string) => {
    await fetch('/api/taches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, statut }),
    })
    fetchData()
  }

  const deleteTache = async (id: number) => {
    if (!confirm('Supprimer cette tâche ?')) return
    const res = await fetch(`/api/taches?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      fetchData()
    } else {
      const err = await res.json()
      alert('Erreur: ' + err.error)
    }
  }

  const clientName = (id?: number) => (id ? clients.find((c) => c.id === id)?.nom_domaine || `#${id}` : '-')

  const filteredTaches = filter === 'toutes' ? taches : taches.filter((t) => t.statut === filter)

  return (
    <div className="container-dashboard">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tâches</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center space-x-2">
          <Plus size={18} />
          <span>Nouvelle tâche</span>
        </button>
      </div>

      {showForm && (
        <div className="card mb-6 space-y-3">
          <input
            type="text"
            placeholder="Titre"
            value={form.titre}
            onChange={(e) => setForm({ ...form, titre: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <textarea
            placeholder="Description (optionnel)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            rows={3}
          />
          <div className="grid grid-cols-3 gap-3">
            <select
              value={form.priorite}
              onChange={(e) => setForm({ ...form, priorite: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            >
              {priorites.map((p) => (
                <option key={p} value={p}>{prioriteLabels[p]}</option>
              ))}
            </select>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
            <select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">Aucun client lié</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.nom_domaine}</option>
              ))}
            </select>
          </div>
          <button onClick={createTache} className="btn-primary">Créer</button>
        </div>
      )}

      <div className="flex space-x-2 mb-6">
        {(['toutes', 'a_faire', 'en_cours', 'terminee'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              filter === f ? 'bg-wine text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {f === 'toutes' ? 'Toutes' : statutLabels[f]}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : filteredTaches.length === 0 ? (
          <p className="text-gray-500">Aucune tâche</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Titre</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Priorité</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Deadline</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTaches.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{t.titre}</p>
                      {t.description && <p className="text-xs text-gray-500 mt-1">{t.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm">{clientName(t.client_id)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${prioriteBadge[t.priorite] || 'badge-info'}`}>
                        {prioriteLabels[t.priorite] || t.priorite}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {t.deadline ? new Date(t.deadline).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={t.statut}
                        onChange={(e) => updateStatut(t.id, e.target.value)}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        {statuts.map((s) => (
                          <option key={s} value={s}>{statutLabels[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteTache(t.id)}
                        className="flex items-center space-x-1 text-xs px-2 py-1 rounded bg-gray-200 text-gray-700 hover:bg-red-100 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
