'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Client, Article, Post } from '@/lib/types'

export default function MonEspacePage() {
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [uploading, setUploading] = useState<number | null>(null)

  const fetchData = useCallback(async (accessToken: string) => {
    const res = await fetch('/api/client-data', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      router.push('/login')
      return
    }
    const data = await res.json()
    setClient(data.client)
    setArticles(data.articles)
    setPosts(data.posts)
    setLoading(false)
  }, [router])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/login')
        return
      }
      setToken(data.session.access_token)
      fetchData(data.session.access_token)
    })
  }, [router, fetchData])

  const handleUpload = async (postId: number, file: File) => {
    setUploading(postId)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('post_id', String(postId))

    const res = await fetch('/api/client-media', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    if (res.ok) {
      fetchData(token)
    } else {
      alert('Erreur lors de l\'envoi du fichier')
    }
    setUploading(null)
  }

  const handleValidate = async (articleId: number) => {
    const res = await fetch('/api/client-validate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: articleId }),
    })
    if (res.ok) fetchData(token)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Chargement...</div>
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#EDE9E2', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ backgroundColor: '#1A1310', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#F5F2EC', margin: 0 }}>La Gabare</h1>
          <p style={{ fontSize: 13, color: 'rgba(245,242,236,0.6)', margin: '4px 0 0 0' }}>{client?.nom_domaine}</p>
        </div>
        <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid rgba(245,242,236,0.3)', color: '#F5F2EC', padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
          Se déconnecter
        </button>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: '#1A1310', marginBottom: 24 }}>Votre plan éditorial</h2>

        <section style={{ marginBottom: 40 }}>
          <h3 style={{ fontSize: 16, textTransform: 'uppercase', letterSpacing: 1, color: '#B08D57', marginBottom: 16 }}>Articles</h3>
          {articles.length === 0 ? (
            <p style={{ color: '#4A3E37' }}>Aucun article pour le moment.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {articles.map((a) => (
                <div key={a.id} style={{ backgroundColor: '#F5F2EC', border: '1px solid rgba(26,19,16,0.1)', padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 600, color: '#1A1310', margin: '0 0 4px 0' }}>{a.titre}</p>
                    <p style={{ fontSize: 13, color: '#4A3E37', margin: 0 }}>{a.date_publication_prevue || 'Date à confirmer'} · {a.status}</p>
                  </div>
                  {!a.plan_editorial_valide ? (
                    <button onClick={() => handleValidate(a.id)} style={{ padding: '8px 16px', backgroundColor: '#5A1226', color: '#F5F2EC', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                      Valider
                    </button>
                  ) : (
                    <span style={{ fontSize: 13, color: '#6B7355', fontWeight: 600 }}>✓ Validé</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 style={{ fontSize: 16, textTransform: 'uppercase', letterSpacing: 1, color: '#B08D57', marginBottom: 16 }}>Posts réseaux sociaux</h3>
          {posts.length === 0 ? (
            <p style={{ color: '#4A3E37' }}>Aucun post pour le moment.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {posts.map((p) => (
                <div key={p.id} style={{ backgroundColor: '#F5F2EC', border: '1px solid rgba(26,19,16,0.1)', padding: 20 }}>
                  <p style={{ fontWeight: 600, color: '#1A1310', margin: '0 0 4px 0' }}>{p.reseau} · {p.format}</p>
                  <p style={{ fontSize: 14, color: '#4A3E37', margin: '0 0 12px 0' }}>{p.contenu}</p>
                  {p.media_url ? (
                    <p style={{ fontSize: 13, color: '#6B7355', fontWeight: 600 }}>✓ Média envoyé</p>
                  ) : (
                    <label style={{ display: 'inline-block', padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid #1A1310', color: '#1A1310', cursor: 'pointer', fontSize: 13 }}>
                      {uploading === p.id ? 'Envoi...' : 'Envoyer photo/vidéo'}
                      <input
                        type="file"
                        accept="image/*,video/*"
                        style={{ display: 'none' }}
                        onChange={(e) => e.target.files?.[0] && handleUpload(p.id, e.target.files[0])}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
