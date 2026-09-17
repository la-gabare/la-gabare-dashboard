'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchAdminData } from '@/lib/admin-data'
import { Client, Article, Post } from '@/lib/types'
import { CalendarPlus, ChevronDown, ChevronRight, Folder } from 'lucide-react'

const abonnementLabels: Record<string, string> = {
  village: 'Village',
  reserve: 'Réserve',
  grand_cru: 'Grand Cru',
}

type PlanItem = {
  id: string
  type: 'article' | 'post'
  label: string
  date: string
  status?: string
}

const weekOfMonth = (dateStr: string) => {
  const day = parseInt(dateStr.split('-')[2], 10)
  return Math.min(4, Math.ceil(day / 7))
}

const monthLabel = (mois: string) => {
  const label = new Date(mois + '-01T00:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const weekRange = (mois: string, w: number) => {
  const [y, m] = mois.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const start = (w - 1) * 7 + 1
  const end = Math.min(w < 4 ? w * 7 : daysInMonth, daysInMonth)
  const pad = (n: number) => String(n).padStart(2, '0')
  return { start: `${mois}-${pad(start)}`, end: `${mois}-${pad(end)}` }
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedClient, setExpandedClient] = useState<number | null>(null)
  const [planLoading, setPlanLoading] = useState<number | null>(null)
  const [planCache, setPlanCache] = useState<Record<number, PlanItem[]>>({})
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({})
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchClients = async () => {
      const data = await fetchAdminData<Client>('clients', { order_column: 'created_at', order_asc: 'false' })
      setClients(data)
      setLoading(false)
    }
    fetchClients()
  }, [])

  const handleCreatePlan = async (client: Client) => {
    try {
      const res = await fetch('/api/plans-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id,
          date_debut: new Date().toISOString().slice(0, 10),
        }),
      })
      if (res.ok) {
        alert('Plan mis en file d\'attente pour ' + client.nom_domaine + '.')
      } else {
        const err = await res.json()
        alert('Erreur: ' + err.error)
      }
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'inconnue'))
    }
  }

  const handleSendWeeklyEmail = async (client: Client, dateDebut: string, dateFin: string) => {
    try {
      const res = await fetch('/api/mail-hebdo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id, date_debut: dateDebut, date_fin: dateFin }),
      })
      if (res.ok) {
        alert('Mail hebdomadaire mis en file d\'attente pour ' + client.nom_domaine + '.')
      } else {
        const err = await res.json()
        alert('Erreur: ' + err.error)
      }
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'inconnue'))
    }
  }

  const toggleClientPlan = async (client: Client) => {
    if (expandedClient === client.id) {
      setExpandedClient(null)
      return
    }
    setExpandedClient(client.id)
    if (!planCache[client.id]) {
      setPlanLoading(client.id)
      const [articlesRes, postsRes] = await Promise.all([
        fetchAdminData<Article>('articles', { eq_column: 'client_id', eq_value: String(client.id), order_column: 'date_publication_prevue' }),
        fetchAdminData<Post>('posts', { eq_column: 'client_id', eq_value: String(client.id), order_column: 'date_publication_prevue' }),
      ])
      const items: PlanItem[] = [
        ...articlesRes
          .filter((a) => a.date_publication_prevue)
          .map((a) => ({ id: `a${a.id}`, type: 'article' as const, label: a.titre, date: a.date_publication_prevue!, status: a.status })),
        ...postsRes
          .filter((p) => p.date_publication_prevue)
          .map((p) => ({ id: `p${p.id}`, type: 'post' as const, label: `${p.reseau} · ${p.format} — ${p.contenu.slice(0, 50)}`, date: p.date_publication_prevue!, status: p.status })),
      ]
      setPlanCache((prev) => ({ ...prev, [client.id]: items }))
      setPlanLoading(null)
    }
  }

  const toggleMonth = (key: string) => setExpandedMonths((prev) => ({ ...prev, [key]: !prev[key] }))
  const toggleWeek = (key: string) => setExpandedWeeks((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="container-dashboard">
      <h1 className="text-3xl font-bold mb-8">Clients</h1>

      <div className="card">
        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : clients.length === 0 ? (
          <p className="text-gray-500">Aucun client</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Domaine</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Appellation</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Abonnement</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const items = planCache[client.id] || []
                  const months = Array.from(new Set(items.map((i) => i.date.slice(0, 7)))).sort().reverse()
                  return (
                    <Fragment key={client.id}>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{client.nom_domaine}</td>
                        <td className="px-4 py-3 text-sm">{client.appellation || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="badge badge-info">
                            {abonnementLabels[client.abonnement] || client.abonnement}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${client.statut === 'actif' ? 'badge-success' : 'badge-warning'}`}>
                            {client.statut || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{client.email_contact}</td>
                        <td className="px-4 py-3 space-x-2 flex">
                          <Link href={`/clients/${client.id}`} className="text-wine font-semibold text-sm hover:underline px-3 py-1">
                            Voir la fiche →
                          </Link>
                          <button
                            onClick={() => toggleClientPlan(client)}
                            title="Plan du mois"
                            className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                          >
                            {expandedClient === client.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <button
                            onClick={() => handleCreatePlan(client)}
                            title="Créer un plan"
                            className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                          >
                            <CalendarPlus size={16} />
                          </button>
                        </td>
                      </tr>
                      {expandedClient === client.id && (
                        <tr className="border-b bg-gray-50">
                          <td colSpan={6} className="px-4 py-4">
                            {planLoading === client.id ? (
                              <p className="text-sm text-gray-500">Chargement du plan...</p>
                            ) : months.length === 0 ? (
                              <p className="text-sm text-gray-500">Aucun plan pour ce client</p>
                            ) : (
                              <div className="space-y-2">
                                {months.map((m) => {
                                  const monthKey = `${client.id}-${m}`
                                  const monthItems = items.filter((i) => i.date.slice(0, 7) === m)
                                  return (
                                    <div key={m} className="border rounded-lg bg-white">
                                      <button
                                        onClick={() => toggleMonth(monthKey)}
                                        className="w-full flex items-center gap-2 px-4 py-3 font-semibold text-left text-sm"
                                      >
                                        {expandedMonths[monthKey] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        Plan de {monthLabel(m)} ({monthItems.length} éléments)
                                      </button>
                                      {expandedMonths[monthKey] && (
                                        <div className="px-4 pb-4 space-y-2">
                                          {[1, 2, 3, 4].map((w) => {
                                            const weekItems = monthItems
                                              .filter((i) => weekOfMonth(i.date) === w)
                                              .sort((a, b) => a.date.localeCompare(b.date))
                                            const weekKey = `${monthKey}-s${w}`
                                            return (
                                              <div key={w} className="border rounded-lg bg-gray-50">
                                                <button
                                                  onClick={() => toggleWeek(weekKey)}
                                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-left"
                                                >
                                                  {expandedWeeks[weekKey] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                  <Folder size={14} />
                                                  Semaine {w} ({weekItems.length})
                                                </button>
                                                {expandedWeeks[weekKey] && (
                                                  <div className="px-3 pb-3 space-y-1">
                                                    {weekItems.length === 0 ? (
                                                      <p className="text-xs text-gray-500">Rien cette semaine</p>
                                                    ) : (
                                                      weekItems.map((it) => (
                                                        <div key={it.id} className="flex justify-between items-center text-sm border-b py-1">
                                                          <span>
                                                            <span className={`badge ${it.type === 'article' ? 'badge-info' : 'badge-warning'} mr-2`}>
                                                              {it.type === 'article' ? 'Article' : 'Post'}
                                                            </span>
                                                            {it.label}
                                                          </span>
                                                          <span className="text-xs text-gray-500 whitespace-nowrap ml-3">{it.date} · {it.status || 'brouillon'}</span>
                                                        </div>
                                                      ))
                                                    )}
                                                    <div className="pt-2 flex justify-end">
                                                      <button
                                                        onClick={() => {
                                                          const { start, end } = weekRange(m, w)
                                                          handleSendWeeklyEmail(client, start, end)
                                                        }}
                                                        className="px-3 py-1 bg-wine text-white rounded text-xs hover:opacity-90"
                                                      >
                                                        📧 Envoyer le mail hebdomadaire (Semaine {w})
                                                      </button>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
