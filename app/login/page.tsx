'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/mon-espace`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDE9E2' }}>
      <div style={{ maxWidth: 420, width: '100%', padding: '40px', backgroundColor: '#F5F2EC', border: '1px solid rgba(26,19,16,0.1)' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, marginBottom: 8, color: '#1A1310' }}>La Gabare</h1>
        <p style={{ fontSize: 14, color: '#4A3E37', marginBottom: 24 }}>Votre espace client</p>

        {sent ? (
          <p style={{ fontSize: 15, color: '#1A1310', lineHeight: 1.6 }}>
            Un lien de connexion vous a été envoyé à <strong>{email}</strong>. Consultez votre boîte mail.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="votre@email.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid rgba(26,19,16,0.2)',
                marginBottom: 16,
                fontSize: 15,
                backgroundColor: 'white',
              }}
            />
            {error && <p style={{ color: '#5A1226', fontSize: 13, marginBottom: 16 }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#5A1226',
                color: '#F5F2EC',
                border: 'none',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Envoi...' : 'Recevoir mon lien de connexion'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
