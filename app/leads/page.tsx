'use client'

import { Fragment, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Lead } from '@/lib/types'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

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
                  <th className="px-4 py-3 text-left text-sm font-semibold">Pack</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Budget</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <Fragment key={lead.id}>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{lead.nom}</td>
                      <td className="px-4 py-3 text-sm">{lead.domaine}</td>
                      <td className="px-4 py-3">
                        {lead.pack_demande ? (
                          <span className="badge badge-info">{lead.pack_demande}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{lead.email}</td>
                      <td className="px-4 py-3 text-sm">{lead.budget || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {expanded === lead.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </td>
                    </tr>
                    {expanded === lead.id && (
                      <tr className="bg-gray-50 border-b">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                            <div><span className="text-gray-500">Appellation :</span> {lead.appellation || '-'}</div>
                            <div><span className="text-gray-500">Superficie :</span> {lead.surface || '-'}</div>
                            <div><span className="text-gray-500">Vente directe :</span> {lead.directe || '-'}</div>
                            <div><span className="text-gray-500">Slogan :</span> {lead.slogan || '-'}</div>
                            <div><span className="text-gray-500">Site existant :</span> {lead.site || '-'}</div>
                            <div><span className="text-gray-500">URL :</span> {lead.url || '-'}</div>
                            <div><span className="text-gray-500">Réseaux :</span> {lead.reseaux || '-'}</div>
                            <div><span className="text-gray-500">Échéance :</span> {lead.echeance || '-'}</div>
                            <div><span className="text-gray-500">Téléphone :</span> {lead.tel || '-'}</div>
                            <div><span className="text-gray-500">Style visuel :</span> {lead.style_visuel || '-'}</div>
                            <div><span className="text-gray-500">Couleurs :</span> {lead.couleurs_souhaitees || '-'}</div>
                            <div><span className="text-gray-500">Cuvées :</span> {lead.liste_cuvees || '-'}</div>
                            <div className="col-span-2 md:col-span-3"><span className="text-gray-500">Besoins :</span> {lead.besoins || '-'}</div>
                            <div className="col-span-2 md:col-span-3"><span className="text-gray-500">Message :</span> {lead.message || '-'}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
