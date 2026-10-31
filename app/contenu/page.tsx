'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ArticlesPanel from '@/components/ArticlesPanel'
import PostsPanel from '@/components/PostsPanel'
import NewslettersPanel from '@/components/NewslettersPanel'

function Contenu() {
  const onglet = useSearchParams().get('onglet')
  const [tab, setTab] = useState<'articles' | 'posts' | 'newsletters'>(onglet === 'newsletters' ? 'newsletters' : 'articles')
  const onglets = [['articles', 'Articles'], ['posts', 'Posts réseaux sociaux'], ['newsletters', 'Newsletters']] as const

  return (
    <div className="container-dashboard">
      <h1 className="text-3xl font-bold mb-8">Contenu</h1>

      <div className="flex space-x-4 border-b mb-6">
        {onglets.map(([cle, libelle]) => (
          <button
            key={cle}
            onClick={() => setTab(cle)}
            className={`px-4 py-2 font-semibold border-b-2 ${
              tab === cle ? 'border-wine text-wine' : 'border-transparent text-gray-600'
            }`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {tab === 'articles' ? <ArticlesPanel /> : tab === 'posts' ? <PostsPanel /> : <NewslettersPanel />}
    </div>
  )
}

export default function ContenuPage() {
  return <Suspense fallback={<div className="container-dashboard">Chargement...</div>}><Contenu /></Suspense>
}
