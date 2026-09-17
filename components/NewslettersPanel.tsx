'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { fetchAdminData } from '@/lib/admin-data'
import { Newsletter, NewsletterAbonne, Client, Article } from '@/lib/types'

const MdEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

const statuses = ['brouillon', 'a_envoyer', 'envoye']
const statusLabels: Record<string, string> = {
  brouillon: 'Brouillon',
  a_envoyer: 'Prête à envoyer',
  envoye: 'Envoyée',
}

export default function NewslettersPanel() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [abonnes, setAbonnes] = useState<NewsletterAbonne[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAbonnesForm, setShowAbonnesForm] = useState(false)
  const [form, setForm] = useState({
    client_id: '',
    mois: '',
    titre: '',
    contenu: '',
    articles_inclus: [] as number[],
  })
  const [abonneForm, setAbonneForm] = useState({ client_id: '', email: '', nom: '' })

  const fetchData = async () => {
    setLoading(true)
    const [nlRes, abonnesRes, clientsRes, articlesRes] = await Promise.all([
      fetchAdminData<Newsletter>('newsletters', { order_column: 'created_at', order_asc: 'false' }),
      fetchAdminData<NewsletterAbonne>('newsletter_abonnes', { order_column: 'email' }),
      fetchAdminData<Client>('clients', { order_column: 'nom_domaine' }),
      fetchAdminData<Article>('articles', { eq_column: 'status', eq_value: 'publie' }),
    ])
    setNewsletters(nlRes)
    setAbonnes(abonnesRes)
    setClients(clientsRes)
    setArticles(articlesRes)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const clientName = (id: number) => clients.find((c) => c.id === id)?.nom_domaine || `#${id}`
  const abonneCount = (clientId: number) => abonnes.filter((a) => a.client_id === clientId).length
  const clientArticles = (clientId: string) => articles.filter((a) => a.client_id === parseInt(clientId))

  const toggleArticleInclus = (id: number) => {
    setForm((f) => ({
      ...f,
      articles_inclus: f.articles_inclus.includes(id)
        ? f.articles_inclus.filter((a) => a !== id)
        : [...f.articles_inclus, id],
    }))
  }

  const createNewsletter = async () => {
    if (!form.client_id || !form.mois) {
      alert('Client et mois requis')
      return
    }
    const res = await fetch('/api/newsletters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: parseInt(form.client_id),
        mois: form.mois,
        titre: form.titre || null,
        contenu: form.contenu || null,
        articles_inclus: form.articles_inclus,
        status: 'brouillon',
      }),
    })
    if (res.ok) {
      setForm({ client_id: '', mois: '', titre: '', contenu: '', articles_inclus: [] })
      setShowForm(false)
      fetchData()
    } else {
      const err = await res.json()
      alert('Erreur: ' + err.error)
    }
  }

  const updateStatus = async (id: number, status: string) => {
    await fetch('/api/newsletters', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    fetchData()
  }

  const sendNewsletter = async (nl: Newsletter) => {
    if (abonneCount(nl.client_id) === 0) {
      alert("Ce client n'a aucun abonné newsletter — ajoutez-en avant d'envoyer.")
      return
    }
    if (!confirm(`Mettre cette newsletter en file d'envoi vers ${abonneCount(nl.client_id)} abonné(s) ?`)) return
    await fetch('/api/newsletters', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: nl.id, status: 'a_envoyer' }),
    })
    fetchData()
  }

  const deleteNewsletter = async (id: number) => {
    if (!confirm('Supprimer cette newsletter ?')) return
    await fetch('/api/newsletters', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetchData()
  }

  const addAbonne = async () => {
    if (!abonneForm.client_id || !abonneForm.email) {
      alert('Client et email requis')
      return
    }
    const res = await fetch('/api/newsletter-abonnes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: parseInt(abonneForm.client_id),
        email: abonneForm.email,
        nom: abonneForm.nom || null,
      }),
    })
    if (res.ok) {
      setAbonneForm({ client_id: '', email: '', nom: '' })
      fetchData()
    } else {
      const err = await res.json()
      alert('Erreur: ' + err.error)
    }
  }

  const deleteAbonne = async (id: number) => {
    await fetch('/api/newsletter-abonnes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetchData()
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        <button onClick={() => setShowAbonnesForm(!showAbonnesForm)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
          Gérer les abonnés
        </button>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          Nouvelle newsletter
        </button>
      </div>

      {showAbonnesForm && (
        <div className="card mb-6 space-y-3">
          <h3 className="font-bold">Abonnés newsletter</h3>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={abonneForm.client_id}
              onChange={(e) => setAbonneForm({ ...abonneForm, client_id: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.nom_domaine}</option>
              ))}
            </select>
            <input
              type="email"
              placeholder="Email"
              value={abonneForm.email}
              onChange={(e) => setAbonneForm({ ...abonneForm, email: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Nom (optionnel)"
              value={abonneForm.nom}
              onChange={(e) => setAbonneForm({ ...abonneForm, nom: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <button onClick={addAbonne} className="btn-primary text-sm">Ajouter l'abonné</button>

          <div className="max-h-64 overflow-y-auto mt-3 space-y-1">
            {abonnes.map((a) => (
              <div key={a.id} className="flex justify-between items-center text-sm border-b py-1">
                <span>{clientName(a.client_id)} — {a.nom ? `${a.nom} · ` : ''}{a.email}</span>
                <button onClick={() => deleteAbonne(a.id)} className="text-red-500 text-xs hover:underline">Supprimer</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="card mb-6 space-y-3">
          <select
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value, articles_inclus: [] })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">Sélectionner un client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.nom_domaine} ({abonneCount(c.id)} abonnés)</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="month"
              value={form.mois}
              onChange={(e) => setForm({ ...form, mois: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Titre de la newsletter"
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
          </div>
          <div data-color-mode="light">
            <MdEditor
              value={form.contenu}
              onChange={(val) => setForm({ ...form, contenu: val || '' })}
              preview="edit"
              height={200}
            />
          </div>
          {form.client_id && (
            <div>
              <label className="block text-sm font-semibold mb-2">Articles à inclure</label>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                {clientArticles(form.client_id).length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun article publié pour ce client</p>
                ) : (
                  clientArticles(form.client_id).map((a) => (
                    <label key={a.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.articles_inclus.includes(a.id)}
                        onChange={() => toggleArticleInclus(a.id)}
                      />
                      {a.titre}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
          <button onClick={createNewsletter} className="btn-primary">Créer</button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : newsletters.length === 0 ? (
        <p className="text-gray-500">Aucune newsletter</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Mois</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Titre</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Abonnés</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {newsletters.map((nl) => (
                <tr key={nl.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{clientName(nl.client_id)}</td>
                  <td className="px-4 py-3 font-medium">{nl.mois}</td>
                  <td className="px-4 py-3 text-sm">{nl.titre || '-'}</td>
                  <td className="px-4 py-3 text-sm">{abonneCount(nl.client_id)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={nl.status || 'brouillon'}
                      onChange={(e) => updateStatus(nl.id, e.target.value)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>{statusLabels[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                    {nl.status !== 'envoye' && (
                      <button
                        onClick={() => sendNewsletter(nl)}
                        className="px-3 py-1 bg-wine text-white rounded text-sm hover:opacity-90"
                      >
                        📧 Envoyer
                      </button>
                    )}
                    <button
                      onClick={() => deleteNewsletter(nl.id)}
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
