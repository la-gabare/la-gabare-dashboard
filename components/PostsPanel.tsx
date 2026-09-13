'use client'

import { useEffect, useState } from 'react'
import { fetchAdminData } from '@/lib/admin-data'
import { Post, Client } from '@/lib/types'

const statuses = ['brouillon', 'en_attente_media', 'media_recu', 'confirme', 'programme', 'publie']
const formats = ['photo', 'story', 'carrousel', 'video']

export default function PostsPanel() {
  const [posts, setPosts] = useState<Post[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    client_id: '',
    contenu: '',
    reseau: 'instagram',
    format: 'photo',
    cta: '',
    date_publication_prevue: '',
  })

  const fetchData = async () => {
    setLoading(true)
    const [postsRes, clientsRes] = await Promise.all([
      fetchAdminData<Post>('posts', { order_column: 'date_publication_prevue' }),
      fetchAdminData<Client>('clients', { order_column: 'nom_domaine' }),
    ])
    setPosts(postsRes)
    setClients(clientsRes)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const createPost = async () => {
    if (!form.client_id || !form.contenu) {
      alert('Client et contenu requis')
      return
    }
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: parseInt(form.client_id),
        contenu: form.contenu,
        reseau: form.reseau,
        format: form.format,
        cta: form.cta || null,
        date_publication_prevue: form.date_publication_prevue || null,
        status: 'brouillon',
      }),
    })
    if (res.ok) {
      setForm({ client_id: '', contenu: '', reseau: 'instagram', format: 'photo', cta: '', date_publication_prevue: '' })
      setShowForm(false)
      fetchData()
    } else {
      const err = await res.json()
      alert('Erreur: ' + err.error)
    }
  }

  const updateStatus = async (id: number, status: string) => {
    await fetch('/api/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    fetchData()
  }

  const clientName = (id: number) => clients.find((c) => c.id === id)?.nom_domaine || `#${id}`

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          Nouveau post
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
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.reseau}
              onChange={(e) => setForm({ ...form, reseau: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
              <option value="linkedin">LinkedIn</option>
            </select>
            <select
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            >
              {formats.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Légende / contenu"
            value={form.contenu}
            onChange={(e) => setForm({ ...form, contenu: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            rows={3}
          />
          <input
            type="text"
            placeholder="CTA"
            value={form.cta}
            onChange={(e) => setForm({ ...form, cta: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <input
            type="date"
            value={form.date_publication_prevue}
            onChange={(e) => setForm({ ...form, date_publication_prevue: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <button onClick={createPost} className="btn-primary">Créer</button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-500">Aucun post</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Contenu</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Réseau/Format</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date prévue</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{clientName(p.client_id)}</td>
                  <td className="px-4 py-3 text-sm max-w-xs truncate">{p.contenu}</td>
                  <td className="px-4 py-3 text-sm">{p.reseau} · {p.format}</td>
                  <td className="px-4 py-3 text-sm">{p.date_publication_prevue || '-'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={p.status || 'brouillon'}
                      onChange={(e) => updateStatus(p.id, e.target.value)}
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
    </div>
  )
}
