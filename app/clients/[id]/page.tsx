'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { fetchAdminData } from '@/lib/admin-data'
import { Client, Article, Post, PlanGeneration, MailHebdoRequest } from '@/lib/types'
import PaymentLinkGenerator from '@/components/PaymentLinkGenerator'
import ClientEditModal from '@/components/ClientEditModal'
import { ChevronDown, ChevronRight, Folder } from 'lucide-react'

const abonnementQuotas: Record<string, string> = {
  village: '4 articles + 4 idées story / mois',
  reserve: '8 articles + 8 idées story + 6 images/photos + 2 carrousels / mois',
  grand_cru: '8 articles + 20 idées story + 8 images/photos + 3 carrousels + 1 vidéo / mois',
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

export default function ClientDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [planDate, setPlanDate] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({})
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({})
  const [lastPlan, setLastPlan] = useState<PlanGeneration | null>(null)
  const [lastMail, setLastMail] = useState<MailHebdoRequest | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const [clientRes, articlesRes, postsRes, plansRes, mailsRes] = await Promise.all([
        fetchAdminData<Client>('clients', { id }),
        fetchAdminData<Article>('articles', { eq_column: 'client_id', eq_value: id, order_column: 'date_publication_prevue' }),
        fetchAdminData<Post>('posts', { eq_column: 'client_id', eq_value: id, order_column: 'date_publication_prevue' }),
        fetchAdminData<PlanGeneration>('plans_generation', { eq_column: 'client_id', eq_value: id, order_column: 'created_at', order_asc: 'false' }),
        fetchAdminData<MailHebdoRequest>('mail_hebdo_requests', { eq_column: 'client_id', eq_value: id, order_column: 'created_at', order_asc: 'false' }),
      ])

      setClient(clientRes[0] || null)
      setArticles(articlesRes)
      setPosts(postsRes)
      setLastPlan(plansRes[0] || null)
      setLastMail(mailsRes[0] || null)
      setLoading(false)
    }
    fetchData()
  }, [id])

  const handleCreatePlan = async () => {
    setCreatingPlan(true)
    try {
      const res = await fetch('/api/plans-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client!.id,
          date_debut: planDate || new Date().toISOString().slice(0, 10),
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setLastPlan(created)
        alert('Plan mis en file d\'attente : la génération démarrera sous peu (agent n8n toutes les 15 min).')
      } else {
        const err = await res.json()
        alert('Erreur: ' + err.error)
      }
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'inconnue'))
    }
    setCreatingPlan(false)
  }

  const handleSendWeeklyEmail = async (dateDebut: string, dateFin: string) => {
    try {
      const res = await fetch('/api/mail-hebdo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client!.id, date_debut: dateDebut, date_fin: dateFin }),
      })
      if (res.ok) {
        const created = await res.json()
        setLastMail(created)
        alert('Mail hebdomadaire mis en file d\'attente : il partira sous peu (agent n8n toutes les 15 min).')
      } else {
        const err = await res.json()
        alert('Erreur: ' + err.error)
      }
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'inconnue'))
    }
  }

  const toggleMonth = (m: string) => setExpandedMonths((prev) => ({ ...prev, [m]: !prev[m] }))
  const toggleWeek = (key: string) => setExpandedWeeks((prev) => ({ ...prev, [key]: !prev[key] }))

  if (loading) return <div className="container-dashboard">Chargement...</div>
  if (!client) return <div className="container-dashboard">Client introuvable</div>

  const planItems: PlanItem[] = [
    ...articles
      .filter((a) => a.date_publication_prevue)
      .map((a) => ({ id: `a${a.id}`, type: 'article' as const, label: a.titre, date: a.date_publication_prevue!, status: a.status })),
    ...posts
      .filter((p) => p.date_publication_prevue)
      .map((p) => ({ id: `p${p.id}`, type: 'post' as const, label: `${p.reseau} · ${p.format} — ${p.contenu.slice(0, 50)}`, date: p.date_publication_prevue!, status: p.status })),
  ]
  const months = Array.from(new Set(planItems.map((i) => i.date.slice(0, 7)))).sort().reverse()

  return (
    <div className="container-dashboard space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{client.nom_domaine}</h1>
          <p className="text-gray-600">{client.appellation} — {client.region}</p>
        </div>
        <button
          onClick={() => setEditModalOpen(true)}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Éditer
        </button>
      </div>

      <ClientEditModal
        client={client}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={(updatedClient) => setClient(updatedClient)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Fiche client</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-600">Email</dt><dd>{client.email_contact}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Type de vin</dt><dd>{client.type_vin || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Style</dt><dd>{client.style || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Public cible</dt><dd>{client.public_cible || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Tone de voix</dt><dd>{client.tone_voix || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Statut</dt><dd><span className={`badge ${client.statut === 'actif' ? 'badge-success' : 'badge-warning'}`}>{client.statut}</span></dd></div>
          </dl>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Abonnement</h2>
          <p className="badge badge-info mb-3">{client.abonnement}</p>
          <p className="text-sm text-gray-600">{abonnementQuotas[client.abonnement] || 'Quota non défini'}</p>
          {client.histoire && (
            <>
              <h3 className="font-semibold mt-4 mb-1 text-sm">Histoire</h3>
              <p className="text-sm text-gray-600">{client.histoire}</p>
            </>
          )}
        </div>
      </div>

      <PaymentLinkGenerator client={client} />

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Plan éditorial</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={planDate}
            onChange={(e) => setPlanDate(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          />
          <button onClick={handleCreatePlan} className="btn-primary" disabled={creatingPlan}>
            {creatingPlan ? 'Envoi...' : 'Créer un plan'}
          </button>
        </div>
        <div className="mt-3 text-sm text-gray-600 space-y-1">
          <p>
            Dernier plan généré :{' '}
            {lastPlan
              ? `${new Date(lastPlan.created_at).toLocaleString('fr-FR')} (${lastPlan.status})`
              : 'jamais'}
          </p>
          <p>
            Dernier mail hebdomadaire envoyé :{' '}
            {lastMail
              ? `${new Date(lastMail.created_at).toLocaleString('fr-FR')} (${lastMail.status})`
              : 'jamais'}
          </p>
        </div>
      </div>

      {months.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Plan du mois</h2>
          <div className="space-y-2">
            {months.map((m) => {
              const monthItems = planItems.filter((i) => i.date.slice(0, 7) === m)
              return (
                <div key={m} className="border rounded-lg">
                  <button
                    onClick={() => toggleMonth(m)}
                    className="w-full flex items-center gap-2 px-4 py-3 font-semibold text-left"
                  >
                    {expandedMonths[m] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    Plan de {monthLabel(m)} ({monthItems.length} éléments)
                  </button>
                  {expandedMonths[m] && (
                    <div className="px-4 pb-4 space-y-2">
                      {[1, 2, 3, 4].map((w) => {
                        const weekItems = monthItems
                          .filter((i) => weekOfMonth(i.date) === w)
                          .sort((a, b) => a.date.localeCompare(b.date))
                        const weekKey = `${m}-s${w}`
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
                                      handleSendWeeklyEmail(start, end)
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
        </div>
      )}

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Articles ({articles.length})</h2>
        {articles.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun article</p>
        ) : (
          <div className="space-y-2">
            {articles.map((a) => (
              <div key={a.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">{a.titre}</p>
                  <p className="text-xs text-gray-500">{a.date_publication_prevue || 'Pas de date'}</p>
                </div>
                <span className="badge badge-info">{a.status || 'brouillon'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Posts ({posts.length})</h2>
        {posts.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun post</p>
        ) : (
          <div className="space-y-2">
            {posts.map((p) => (
              <div key={p.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">{p.contenu.slice(0, 60)}...</p>
                  <p className="text-xs text-gray-500">{p.reseau} · {p.format} · {p.date_publication_prevue || 'Pas de date'}</p>
                </div>
                <span className="badge badge-info">{p.status || 'brouillon'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
