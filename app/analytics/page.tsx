'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Publication, Client } from '@/lib/types'

export default function AnalyticsPage() {
  const [publications, setPublications] = useState<Publication[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [pubRes, clientsRes] = await Promise.all([
        supabase.from('publications').select('*').order('date_publication', { ascending: false }),
        supabase.from('clients').select('*'),
      ])
      setPublications(pubRes.data || [])
      setClients(clientsRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const clientName = (id: number) => clients.find((c) => c.id === id)?.nom_domaine || `#${id}`

  const totalImpressions = publications.reduce((sum, p) => sum + (p.impressions || 0), 0)
  const totalEngagements = publications.reduce((sum, p) => sum + (p.engagements || 0), 0)

  return (
    <div className="container-dashboard">
      <h1 className="text-3xl font-bold mb-8">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <h2 className="text-gray-600 text-sm font-semibold">Publications</h2>
          <p className="text-3xl font-bold text-wine mt-2">{publications.length}</p>
        </div>
        <div className="card">
          <h2 className="text-gray-600 text-sm font-semibold">Impressions totales</h2>
          <p className="text-3xl font-bold text-wine mt-2">{totalImpressions.toLocaleString()}</p>
        </div>
        <div className="card">
          <h2 className="text-gray-600 text-sm font-semibold">Engagements totaux</h2>
          <p className="text-3xl font-bold text-wine mt-2">{totalEngagements.toLocaleString()}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Publications récentes</h2>
        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : publications.length === 0 ? (
          <p className="text-gray-500">Aucune publication trackée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Réseau</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Impressions</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Engagements</th>
                </tr>
              </thead>
              <tbody>
                {publications.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{clientName(p.client_id)}</td>
                    <td className="px-4 py-3 text-sm">{p.reseau || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {p.date_publication ? new Date(p.date_publication).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">{p.impressions ?? '-'}</td>
                    <td className="px-4 py-3 text-sm">{p.engagements ?? '-'}</td>
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
