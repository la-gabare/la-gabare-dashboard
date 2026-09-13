'use client'

import { useState } from 'react'
import ArticlesPanel from '@/components/ArticlesPanel'
import PostsPanel from '@/components/PostsPanel'

export default function ContenuPage() {
  const [tab, setTab] = useState<'articles' | 'posts'>('articles')

  return (
    <div className="container-dashboard">
      <h1 className="text-3xl font-bold mb-8">Contenu</h1>

      <div className="flex space-x-4 border-b mb-6">
        <button
          onClick={() => setTab('articles')}
          className={`px-4 py-2 font-semibold border-b-2 ${
            tab === 'articles' ? 'border-wine text-wine' : 'border-transparent text-gray-600'
          }`}
        >
          Articles
        </button>
        <button
          onClick={() => setTab('posts')}
          className={`px-4 py-2 font-semibold border-b-2 ${
            tab === 'posts' ? 'border-wine text-wine' : 'border-transparent text-gray-600'
          }`}
        >
          Posts réseaux sociaux
        </button>
      </div>

      {tab === 'articles' ? <ArticlesPanel /> : <PostsPanel />}
    </div>
  )
}
