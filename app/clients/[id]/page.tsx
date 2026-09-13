'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { fetchAdminData } from '@/lib/admin-data'
import { Client, Article, Post } from '@/lib/types'

const abonnementQuotas: Record<string, string> = {
  village: '4 articles + 4 idées story / mois',
  reserve: '6 articles + 6 posts + 2 carrousels + 8 idées story / mois',
  grand_cru: '8 articles + 8 posts + 3 carrousels + 1 reel + 5 story / mois',
}

export default function ClientDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [clientRes, articlesRes, postsRes] = await Promise.all([
        fetchAdminData<Client>('clients', { id }),
        fetchAdminData<Article>('articles', { eq_column: 'client_id', eq_value: id, order_column: 'date_publication_prevue' }),
        fetchAdminData<Post>('posts', { eq_column: 'client_id', eq_value: id, order_column: 'date_publication_prevue' }),
      ])

      setClient(clientRes[0] || null)
      setArticles(articlesRes)
      setPosts(postsRes)
      setLoading(false)
    }
    fetchData()
  }, [id])

  if (loading) return <div className="container-dashboard">Chargement...</div>
  if (!client) return <div className="container-dashboard">Client introuvable</div>

  return (
    <div className="container-dashboard space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{client.nom_domaine}</h1>
        <p className="text-gray-600">{client.appellation} — {client.region}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Fiche client</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-600">Email</dt><dd>{client.email_contact}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Type de vin</dt><dd>{client.type_vin || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Style</dt><dd>{client.style || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Public cible</dt><dd>{client.public_cible || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Tone de voix</dt><dd>{client.tone_voix || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Statut</dt><dd><span className="badge badge-success">{client.statut}</span></dd></div>
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
