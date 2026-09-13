'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Newsletter, Client } from '@/lib/types'

export default function NewslettersPage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [nlRes, clientsRes] = await Promise.all([
        supabase.from('newsletters').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*'),
      ])
      setNewsletters(nlRes.data || [])
      setClients(clientsRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const clientName = (id: number) => clients.find((c) => c.id === id)?.nom_domaine || `#${id}`

  return (
    <div className="container-dashboard">
      <h1 className="text-3xl font-bold mb-8">Newsletters</h1>

      <div className="card">
        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : newsletters.length === 0 ? (
          <p className="text-gray-500">Aucune newsletter</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Mois</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {newsletters.map((nl) => (
                  <tr key={nl.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{clientName(nl.client_id)}</td>
                    <td className="px-4 py-3 font-medium">{nl.mois}</td>
                    <td className="px-4 py-3">
                      <span className="badge badge-info">{nl.status || '-'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
