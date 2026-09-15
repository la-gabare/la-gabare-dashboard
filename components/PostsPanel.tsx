'use client'

import { useEffect, useState } from 'react'
import { fetchAdminData } from '@/lib/admin-data'
import { Post, Client } from '@/lib/types'

const statuses = ['brouillon', 'en_attente_media', 'media_recu', 'confirme', 'programme', 'publie']
const formats = ['photo', 'story', 'carrousel', 'video']

export default function PostsPanel() {
  const [posts, setPosts] = useState<Post[]>([])
  const [clientPosts, setClientPosts] = useState<any[]>([])
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
    media_url: '',
  })
  const [uploading, setUploading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const [postsRes, clientsRes] = await Promise.all([
      fetchAdminData<Post>('posts', { order_column: 'date_publication_prevue' }),
      fetchAdminData<Client>('clients', { order_column: 'nom_domaine' }),
    ])
    setPosts(postsRes)
    setClients(clientsRes)
    setClientPosts(postsRes || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'post')

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        setForm({ ...form, media_url: data.url })
        alert('✓ Media uploadé')
      } else {
        alert(`Erreur upload: ${data.error || 'Erreur inconnue'}`)
      }
    } catch (err) {
      alert(`Erreur upload: ${err instanceof Error ? err.message : 'Erreur inconnue'}`)
    }
    setUploading(false)
  }

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
        media_url: form.media_url || null,
      }),
    })
    if (res.ok) {
      setForm({ client_id: '', contenu: '', reseau: 'instagram', format: 'photo', cta: '', date_publication_prevue: '', media_url: '' })
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

  const deleteAdminPost = async (id: number) => {
    try {
      const res = await fetch('/api/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (res.ok) {
        fetchData()
      } else {
        console.error('Delete error:', data)
        alert('Erreur: ' + (data.error || 'Suppression échouée'))
      }
    } catch (err) {
      console.error('Delete exception:', err)
      alert('Erreur suppression')
    }
  }

  const deleteClientPost = async (id: string) => {
    try {
      const res = await fetch('/api/client-delete-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (res.ok) {
        fetchData()
      } else {
        console.error('Delete error:', data)
        alert('Erreur: ' + (data.error || 'Suppression échouée'))
      }
    } catch (err) {
      console.error('Delete exception:', err)
      alert('Erreur suppression')
    }
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
          <div className="space-y-2">
            <label className="block text-sm font-semibold">Photo/Vidéo</label>
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                disabled={uploading}
                className="flex-1 px-3 py-2 border rounded-lg"
              />
              {uploading && <span className="px-3 py-2 text-sm text-gray-600">Upload...</span>}
            </div>
            <input
              type="text"
              placeholder="Ou coller une URL de media"
              value={form.media_url}
              onChange={(e) => setForm({ ...form, media_url: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            {form.media_url && (
              <p className="text-sm text-green-600">✓ URL définie</p>
            )}
          </div>
          <button onClick={createPost} className="btn-primary" disabled={uploading}>
            {uploading ? 'Upload...' : 'Créer'}
          </button>
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
                <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
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
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteAdminPost(p.id)}
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

      <hr className="my-8" />
      <h2 className="text-2xl font-bold mb-6">Posts créés par les clients</h2>

      {clientPosts.length === 0 ? (
        <p className="text-gray-500">Aucun post</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Contenu</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date création</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {clientPosts.map((p) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{p.client_id}</td>
                  <td className="px-4 py-3 text-sm max-w-xs truncate">{p.contenu}</td>
                  <td className="px-4 py-3 text-sm">{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteClientPost(p.id)}
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
