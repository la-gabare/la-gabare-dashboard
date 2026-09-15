'use client'

import { useEffect, useState } from 'react'
import { fetchAdminData } from '@/lib/admin-data'
import { Article, Client } from '@/lib/types'

const statuses = ['brouillon', 'en_attente_media', 'media_recu', 'programme', 'publie']

export default function ArticlesPanel() {
  const [articles, setArticles] = useState<Article[]>([])
  const [clientArticles, setClientArticles] = useState<any[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ client_id: '', titre: '', angle: '', contenu: '', date_publication_prevue: '' })

  const fetchData = async () => {
    setLoading(true)
    const [articlesRes, clientsRes] = await Promise.all([
      fetchAdminData<Article>('articles', { order_column: 'date_publication_prevue' }),
      fetchAdminData<Client>('clients', { order_column: 'nom_domaine' }),
    ])
    setArticles(articlesRes)
    setClients(clientsRes)
    setClientArticles(articlesRes || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const createArticle = async () => {
    if (!form.client_id || !form.titre) {
      alert('Client et titre requis')
      return
    }
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: parseInt(form.client_id),
        titre: form.titre,
        angle: form.angle || null,
        contenu: form.contenu || null,
        date_publication_prevue: form.date_publication_prevue || null,
        status: 'brouillon',
      }),
    })
    if (res.ok) {
      setForm({ client_id: '', titre: '', angle: '', contenu: '', date_publication_prevue: '' })
      setShowForm(false)
      fetchData()
    } else {
      const err = await res.json()
      alert('Erreur: ' + err.error)
    }
  }

  const updateStatus = async (id: number, status: string) => {
    await fetch('/api/articles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    fetchData()
  }

  const deleteClientArticle = async (id: string) => {
    if (!confirm('Supprimer cet article?')) return
    const res = await fetch('/api/client-delete-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      fetchData()
    } else {
      alert('Erreur suppression')
    }
  }

  const clientName = (id: number) => clients.find((c) => c.id === id)?.nom_domaine || `#${id}`

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          Nouvel article
        </button>
      </div>

      {showForm && (
        <div className="card mb-6 space-y-3">
          <select
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">Sélectionner un client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.nom_domaine}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Titre"
            value={form.titre}
            onChange={(e) => setForm({ ...form, titre: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <input
            type="text"
            placeholder="Angle"
            value={form.angle}
            onChange={(e) => setForm({ ...form, angle: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <textarea
            placeholder="Contenu"
            value={form.contenu}
            onChange={(e) => setForm({ ...form, contenu: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            rows={4}
          />
          <input
            type="date"
            value={form.date_publication_prevue}
            onChange={(e) => setForm({ ...form, date_publication_prevue: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <button onClick={createArticle} className="btn-primary">Créer</button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : articles.length === 0 ? (
        <p className="text-gray-500">Aucun article</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Titre</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date prévue</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{clientName(a.client_id)}</td>
                  <td className="px-4 py-3 font-medium">{a.titre}</td>
                  <td className="px-4 py-3 text-sm">{a.date_publication_prevue || '-'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={a.status || 'brouillon'}
                      onChange={(e) => updateStatus(a.id, e.target.value)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <hr className="my-8" />
      <h2 className="text-2xl font-bold mb-6">Articles créés par les clients</h2>

      {clientArticles.length === 0 ? (
        <p className="text-gray-500">Aucun article</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Titre</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date création</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {clientArticles.map((a) => (
                <tr key={a.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{a.client_id}</td>
                  <td className="px-4 py-3 font-medium">{a.titre}</td>
                  <td className="px-4 py-3 text-sm">{new Date(a.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteClientArticle(a.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
