'use client'

import { Fragment, useEffect, useState } from 'react'
import { fetchAdminData } from '@/lib/admin-data'
import { Lead } from '@/lib/types'
import { ChevronDown, ChevronUp, Send } from 'lucide-react'

const typeLabels: Record<string, string> = {
  site: 'Demande de site',
  abonnement: 'Abonnement seul',
}

const statutLabels: Record<string, string> = {
  reception: 'Réception',
  mail_envoye: 'Mail envoyé',
  relance: 'Relancé',
  rdv_pris: 'RDV pris',
  formulaire_complete: 'Formulaire complété',
  archive: 'Archivé',
}

const statutColors: Record<string, string> = {
  reception: 'badge-warning',
  mail_envoye: 'badge-info',
  relance: 'badge-warning',
  rdv_pris: 'badge-success',
  formulaire_complete: 'badge-success',
  archive: 'badge-danger',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [filter, setFilter] = useState<'tous' | 'site' | 'abonnement'>('tous')
  const [sending, setSending] = useState<number | null>(null)

  const fetchLeads = async () => {
    const data = await fetchAdminData<Lead>('leads', { order_column: 'created_at', order_asc: 'false' })
    setLeads(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  const triggerMail = async (leadId: number) => {
    setSending(leadId)
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, statut: 'reception' }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert('Erreur: ' + err.error)
        return
      }
      alert('Statut remis à "reception" — le mail sera envoyé automatiquement dans les 2 prochaines minutes.')
      fetchLeads()
    } finally {
      setSending(null)
    }
  }

  const filteredLeads = filter === 'tous' ? leads : leads.filter((l) => (l.type_demande || 'site') === filter)

  return (
    <div className="container-dashboard">
      <h1 className="text-3xl font-bold mb-8">Leads (formulaire de contact)</h1>

      <div className="flex space-x-2 mb-6">
        {(['tous', 'site', 'abonnement'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              filter === f ? 'bg-wine text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {f === 'tous' ? 'Tous' : typeLabels[f]}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : filteredLeads.length === 0 ? (
          <p className="text-gray-500">Aucun lead</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Nom</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Domaine</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Pack / Gamme</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold"></th>
                  <th className="px-4 py-3 text-left text-sm font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <Fragment key={lead.id}>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`badge ${lead.type_demande === 'abonnement' ? 'badge-success' : 'badge-info'}`}>
                          {typeLabels[lead.type_demande || 'site']}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{lead.nom}</td>
                      <td className="px-4 py-3 text-sm">{lead.domaine}</td>
                      <td className="px-4 py-3 text-sm">{lead.pack_demande || '-'}</td>
                      <td className="px-4 py-3 text-sm">{lead.email}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${statutColors[lead.statut || 'reception']}`}>
                          {statutLabels[lead.statut || 'reception']}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => triggerMail(lead.id)}
                          disabled={sending === lead.id}
                          title="Envoyer / renvoyer le mail de prise de contact"
                          className="flex items-center space-x-1 text-xs px-2 py-1 rounded bg-wine text-white hover:bg-wine/90 disabled:opacity-50"
                        >
                          <Send size={14} />
                          <span>{sending === lead.id ? '...' : 'Envoyer mail'}</span>
                        </button>
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
                        <td colSpan={9} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                            <div><span className="text-gray-500">Appellation :</span> {lead.appellation || '-'}</div>
                            <div><span className="text-gray-500">Superficie :</span> {lead.surface || '-'}</div>
                            <div><span className="text-gray-500">Vente directe :</span> {lead.directe || '-'}</div>
                            <div><span className="text-gray-500">Slogan :</span> {lead.slogan || '-'}</div>
                            <div><span className="text-gray-500">Site existant :</span> {lead.site || '-'}</div>
                            <div><span className="text-gray-500">URL :</span> {lead.url || '-'}</div>
                            <div><span className="text-gray-500">Réseaux :</span> {lead.reseaux || '-'}</div>
                            <div><span className="text-gray-500">Budget :</span> {lead.budget || '-'}</div>
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
