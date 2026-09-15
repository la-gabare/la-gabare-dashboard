'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { fetchAdminData } from '@/lib/admin-data'
import { Article, Client } from '@/lib/types'

const MdEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

const statuses = ['brouillon', 'en_attente_media', 'media_recu', 'programme', 'publie']

const angles = [
  'Histoire',
  'Évènement',
  'Pairing',
  'Technique',
  'Terroir',
  'Saisonnalité',
  'Cépage',
  'Œnotourisme',
  'Accords',
  'Événement',
]

export default function ArticlesPanel() {
  const [articles, setArticles] = useState<Article[]>([])
  const [clientArticles, setClientArticles] = useState<any[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ client_id: '', titre: '', angle: '', contenu: '', date_publication_prevue: '', image_url: '' })
  const [uploading, setUploading] = useState(false)
  const [contentMode, setContentMode] = useState<'markdown' | 'html'>('markdown')

  const fetchData = async () => {
    setLoading(true)
    const [articlesRes, clientsRes, pubArticlesRes] = await Promise.all([
      fetchAdminData<Article>('articles', { order_column: 'date_publication_prevue' }),
      fetchAdminData<Client>('clients', { order_column: 'nom_domaine' }),
      fetch('/api/articles-publications').then(r => r.json()),
    ])
    setArticles(articlesRes)
    setClients(clientsRes)
    setClientArticles(pubArticlesRes || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'article')

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        setForm({ ...form, image_url: data.url })
        alert('✓ Image uploadée')
      } else {
        alert(`Erreur upload: ${data.error || 'Erreur inconnue'}`)
      }
    } catch (err) {
      alert(`Erreur upload: ${err instanceof Error ? err.message : 'Erreur inconnue'}`)
    }
    setUploading(false)
  }

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
        image_url: form.image_url || null,
      }),
    })
    if (res.ok) {
      setForm({ client_id: '', titre: '', angle: '', contenu: '', date_publication_prevue: '', image_url: '' })
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

  const deleteAdminArticle = async (id: number) => {
    try {
      const res = await fetch('/api/articles', {
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

  const deleteClientArticle = async (id: string) => {
    try {
      const res = await fetch('/api/client-delete-article', {
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
          <select
            value={form.angle}
            onChange={(e) => setForm({ ...form, angle: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">Sélectionner un angle</option>
            {angles.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <div className="border rounded-lg">
            <div className="flex gap-2 bg-gray-100 p-2 border-b">
              <button
                type="button"
                onClick={() => setContentMode('markdown')}
                className={`px-3 py-1 rounded text-sm font-semibold ${contentMode === 'markdown' ? 'bg-wine text-white' : 'bg-white'}`}
              >
                Markdown
              </button>
              <button
                type="button"
                onClick={() => setContentMode('html')}
                className={`px-3 py-1 rounded text-sm font-semibold ${contentMode === 'html' ? 'bg-wine text-white' : 'bg-white'}`}
              >
                HTML
              </button>
            </div>
            {contentMode === 'markdown' ? (
              <div data-color-mode="light">
                <MdEditor
                  value={form.contenu}
                  onChange={(val) => setForm({ ...form, contenu: val || '' })}
                  preview="edit"
                  hideToolbar={false}
                  height={200}
                  visibleDragbar={false}
                  textareaProps={{ disabled: false }}
                />
              </div>
            ) : (
              <textarea
                placeholder="Contenu HTML"
                value={form.contenu}
                onChange={(e) => setForm({ ...form, contenu: e.target.value })}
                className="w-full px-3 py-2"
                rows={8}
              />
            )}
          </div>
          <input
            type="date"
            value={form.date_publication_prevue}
            onChange={(e) => setForm({ ...form, date_publication_prevue: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <div className="space-y-2">
            <label className="block text-sm font-semibold">Image/Média</label>
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="flex-1 px-3 py-2 border rounded-lg"
              />
              {uploading && <span className="px-3 py-2 text-sm text-gray-600">Upload...</span>}
            </div>
            <input
              type="text"
              placeholder="Ou coller une URL d'image"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            {form.image_url && (
              <p className="text-sm text-green-600">✓ URL définie</p>
            )}
          </div>
          <button onClick={createArticle} className="btn-primary" disabled={uploading}>
            {uploading ? 'Upload...' : 'Créer'}
          </button>
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
                <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
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
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteAdminArticle(a.id)}
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
