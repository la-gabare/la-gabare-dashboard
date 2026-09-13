'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Client } from '@/lib/types'

const abonnementLabels: Record<string, string> = {
  village: 'Village',
  reserve: 'Réserve',
  grand_cru: 'Grand Cru',
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error) setClients(data || [])
      setLoading(false)
    }
    fetchClients()
  }, [])

  return (
    <div className="container-dashboard">
      <h1 className="text-3xl font-bold mb-8">Clients</h1>

      <div className="card">
        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : clients.length === 0 ? (
          <p className="text-gray-500">Aucun client</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Domaine</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Appellation</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Abonnement</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{client.nom_domaine}</td>
                    <td className="px-4 py-3 text-sm">{client.appellation || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="badge badge-info">
                        {abonnementLabels[client.abonnement] || client.abonnement}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${client.statut === 'actif' ? 'badge-success' : 'badge-warning'}`}>
                        {client.statut || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{client.email_contact}</td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${client.id}`} className="text-wine font-semibold text-sm hover:underline">
                        Voir la fiche →
                      </Link>
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
