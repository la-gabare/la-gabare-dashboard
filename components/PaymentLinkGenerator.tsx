'use client'

import { useState } from 'react'
import { Client } from '@/lib/types'

const packAmounts: Record<string, number> = {
  'Pack Essentiel': 1990,
  'Pack Pro': 4490,
  village: 150,
  reserve: 350,
  grand_cru: 550,
}

interface Props {
  client: Client
}

export default function PaymentLinkGenerator({ client }: Props) {
  const [type, setType] = useState<'site' | 'abonnement'>('abonnement')
  const [montant, setMontant] = useState(String(packAmounts[client.abonnement] || ''))
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [link, setLink] = useState('')

  const handleGenerate = async () => {
    if (!montant) {
      alert('Montant requis')
      return
    }
    setLoading(true)
    setLink('')
    try {
      const res = await fetch('/api/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id,
          type,
          montant: parseFloat(montant),
          description: description || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert('Erreur: ' + data.error)
        return
      }
      setLink(data.url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Lien de paiement</h2>

      {client.statut === 'en_attente_paiement' && (
        <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-4">
          En attente de paiement — l&apos;accès à l&apos;espace client sera envoyé automatiquement dès confirmation.
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 mb-3">
        <select value={type} onChange={(e) => setType(e.target.value as 'site' | 'abonnement')} className="px-3 py-2 border rounded-lg text-sm">
          <option value="abonnement">Abonnement (mensuel)</option>
          <option value="site">Site (paiement unique)</option>
        </select>
        <input
          type="number"
          placeholder="Montant €"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        />
        <input
          type="text"
          placeholder="Description (optionnel)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        />
      </div>

      <button onClick={handleGenerate} disabled={loading} className="btn-primary disabled:opacity-50 text-sm">
        {loading ? 'Génération...' : 'Générer le lien de paiement'}
      </button>

      {link && (
        <div className="mt-4 p-3 bg-gray-50 border rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Lien à envoyer au client :</p>
          <div className="flex items-center space-x-2">
            <input readOnly value={link} className="flex-1 px-2 py-1 text-sm border rounded bg-white" onFocus={(e) => e.target.select()} />
            <button
              onClick={() => navigator.clipboard.writeText(link)}
              className="text-xs px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              Copier
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
