'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [counts, setCounts] = useState({
    leads: 0,
    cahiers: 0,
    clients: 0,
    articlesEnAttente: 0,
    postsEnAttente: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCounts = async () => {
      const [leads, cahiers, clients, articles, posts] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('traite', false),
        supabase.from('cahier_des_charges').select('id', { count: 'exact', head: true }).eq('traite', false),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('statut', 'actif'),
        supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'brouillon'),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'brouillon'),
      ])

      setCounts({
        leads: leads.count || 0,
        cahiers: cahiers.count || 0,
        clients: clients.count || 0,
        articlesEnAttente: articles.count || 0,
        postsEnAttente: posts.count || 0,
      })
      setLoading(false)
    }

    fetchCounts()
  }, [])

  if (loading) {
    return <div className="container-dashboard">Chargement...</div>
  }

  const cards = [
    { label: 'Leads non traités', value: counts.leads, href: '/leads' },
    { label: 'Cahiers des charges à traiter', value: counts.cahiers, href: '/cahier-des-charges' },
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
    </div>
  )
}
