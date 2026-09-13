'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Lead } from '@/lib/types'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeads = async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error) setLeads(data || [])
      setLoading(false)
    }
    fetchLeads()
  }, [])

  return (
    <div className="container-dashboard">
      <h1 className="text-3xl font-bold mb-8">Leads (formulaire de contact)</h1>

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
                  <th className="px-4 py-3 text-left text-sm font-semibold">Message</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
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
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{lead.message || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(lead.created_at).toLocaleDateString('fr-FR')}
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
