'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Lead } from '@/lib/types'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'tous' | 'non_traites' | 'traites'>('non_traites')

  const fetchLeads = async () => {
    setLoading(true)
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false })

    if (filter === 'non_traites') query = query.eq('traite', false)
    if (filter === 'traites') query = query.eq('traite', true)

    const { data, error } = await query
    if (!error) setLeads(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchLeads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const markTraite = async (id: number, traite: boolean) => {
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, traite }),
    })
    fetchLeads()
  }

  return (
    <div className="container-dashboard">
      <h1 className="text-3xl font-bold mb-8">Leads (formulaire de contact)</h1>

      <div className="flex space-x-2 mb-6">
        {(['non_traites', 'traites', 'tous'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              filter === f ? 'bg-wine text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {f === 'non_traites' ? 'Non traités' : f === 'traites' ? 'Traités' : 'Tous'}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : leads.length === 0 ? (
          <p className="text-gray-500">Aucun lead</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Nom</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Domaine</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Budget</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Échéance</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{lead.nom}</td>
                    <td className="px-4 py-3 text-sm">{lead.domaine}</td>
                    <td className="px-4 py-3 text-sm">{lead.email}</td>
                    <td className="px-4 py-3 text-sm">{lead.budget || '-'}</td>
                    <td className="px-4 py-3 text-sm">{lead.echeance || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => markTraite(lead.id, !lead.traite)}
                        className="btn-primary text-sm py-1"
                      >
                        {lead.traite ? 'Marquer non traité' : 'Marquer traité'}
                      </button>
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
