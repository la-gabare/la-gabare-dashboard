'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchAdminData } from '@/lib/admin-data'
import { Tache, Client, PlanGeneration } from '@/lib/types'

const prioriteBadge: Record<string, string> = {
  basse: 'badge-info',
  normale: 'badge-warning',
  haute: 'badge-danger',
}

const statuts = ['a_faire', 'en_cours', 'terminee']
const statutLabels: Record<string, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  terminee: 'Terminée',
}

export default function Home() {
  const [counts, setCounts] = useState({
    leads: 0,
    clients: 0,
    articlesEnAttente: 0,
    postsEnAttente: 0,
  })
  const [taches, setTaches] = useState<Tache[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [clientsSansPlan, setClientsSansPlan] = useState<Client[]>([])
  const [creatingPlanFor, setCreatingPlanFor] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchTaches = async () => {
    const data = await fetchAdminData<Tache>('taches', { order_column: 'created_at', order_asc: 'false' })
    setTaches(data.filter((t) => t.statut !== 'terminee'))
  }

  useEffect(() => {
    const fetchCounts = async () => {
      const [leads, clientsRes, articles, posts, plansRes] = await Promise.all([
        fetchAdminData('leads'),
        fetchAdminData<Client>('clients', { eq_column: 'statut', eq_value: 'actif' }),
        fetchAdminData('articles', { eq_column: 'status', eq_value: 'brouillon' }),
        fetchAdminData('posts', { eq_column: 'status', eq_value: 'brouillon' }),
        fetchAdminData<PlanGeneration>('plans_generation'),
      ])

      setCounts({
        leads: leads.length,
        clients: clientsRes.length,
        articlesEnAttente: articles.length,
        postsEnAttente: posts.length,
      })
      setClients(clientsRes)
      const clientIdsAvecPlan = new Set(plansRes.map((p) => p.client_id))
      setClientsSansPlan(clientsRes.filter((c) => !clientIdsAvecPlan.has(c.id)))
      setLoading(false)
    }

    fetchCounts()
    fetchTaches()
  }, [])

  const handleCreatePlan = async (client: Client) => {
    setCreatingPlanFor(client.id)
    try {
      const res = await fetch('/api/plans-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id, date_debut: new Date().toISOString().slice(0, 10) }),
      })
      if (res.ok) {
        setClientsSansPlan((prev) => prev.filter((c) => c.id !== client.id))
      } else {
        const err = await res.json()
        alert('Erreur: ' + err.error)
      }
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'inconnue'))
    }
    setCreatingPlanFor(null)
  }

  const updateStatut = async (id: number, statut: string) => {
    await fetch('/api/taches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, statut }),
    })
    fetchTaches()
  }

  const clientName = (id?: number) => (id ? clients.find((c) => c.id === id)?.nom_domaine : null)

  if (loading) {
    return <div className="container-dashboard">Chargement...</div>
  }

  const cards = [
    { label: 'Leads (total)', value: counts.leads, href: '/leads' },
    { label: 'Clients actifs', value: counts.clients, href: '/clients' },
    { label: 'Articles en brouillon', value: counts.articlesEnAttente, href: '/contenu' },
    { label: 'Posts en brouillon', value: counts.postsEnAttente, href: '/contenu' },
  ]

  return (
    <div className="container-dashboard">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <a key={card.label} href={card.href} className="card block hover:shadow-md transition">
            <h2 className="text-gray-600 text-sm font-semibold">{card.label}</h2>
            <p className="text-3xl font-bold text-wine mt-2">{card.value}</p>
          </a>
        ))}
      </div>

      <div className="card mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Clients sans plan généré ({clientsSansPlan.length})</h2>
          <Link href="/clients" className="text-wine font-semibold text-sm hover:underline">
            Voir tous les clients →
          </Link>
        </div>
        {clientsSansPlan.length === 0 ? (
          <p className="text-gray-500 text-sm">Tous les clients actifs ont un plan généré</p>
        ) : (
          <div className="space-y-2">
            {clientsSansPlan.map((c) => (
              <div key={c.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">{c.nom_domaine}</p>
                  <p className="text-xs text-gray-500">{c.appellation} · {c.abonnement}</p>
                </div>
                <button
                  onClick={() => handleCreatePlan(c)}
                  disabled={creatingPlanFor === c.id}
                  className="btn-primary text-sm"
                >
                  {creatingPlanFor === c.id ? 'Envoi...' : 'Créer un plan'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Actions à faire ({taches.length})</h2>
          <Link href="/taches" className="text-wine font-semibold text-sm hover:underline">
            Voir toutes les tâches →
          </Link>
        </div>
        {taches.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune action en attente</p>
        ) : (
          <div className="space-y-2">
            {taches.map((t) => (
              <div key={t.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">
                    {t.titre}
                    {clientName(t.client_id) && (
                      <span className="text-gray-500 font-normal"> — {clientName(t.client_id)}</span>
                    )}
                  </p>
                  {t.description && <p className="text-xs text-gray-500 mt-1 max-w-xl">{t.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className={`badge ${prioriteBadge[t.priorite] || 'badge-info'}`}>{t.priorite}</span>
                  <select
                    value={t.statut}
                    onChange={(e) => updateStatut(t.id, e.target.value)}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    {statuts.map((s) => (
                      <option key={s} value={s}>{statutLabels[s]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => updateStatut(t.id, 'terminee')}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  >
                    Terminer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
