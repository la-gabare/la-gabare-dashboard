'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchAdminData } from '@/lib/admin-data'
import { Client } from '@/lib/types'
import { CalendarPlus, Mail } from 'lucide-react'

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
      const data = await fetchAdminData<Client>('clients', { order_column: 'created_at', order_asc: 'false' })
      setClients(data)
      setLoading(false)
    }
    fetchClients()
  }, [])

  const handleCreatePlan = async (client: Client) => {
    try {
      const res = await fetch('/api/plans-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id,
          date_debut: new Date().toISOString().slice(0, 10),
        }),
      })
      if (res.ok) {
        alert('Plan mis en file d\'attente pour ' + client.nom_domaine + '.')
      } else {
        const err = await res.json()
        alert('Erreur: ' + err.error)
      }
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'inconnue'))
    }
  }

  const handleSendWeeklyEmail = (client: Client) => {
    alert('Action à paramétrer prochainement')
  }

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
                    <td className="px-4 py-3 space-x-2 flex">
                      <Link href={`/clients/${client.id}`} className="text-wine font-semibold text-sm hover:underline px-3 py-1">
                        Voir la fiche →
                      </Link>
                      <button
                        onClick={() => handleCreatePlan(client)}
                        title="Créer un plan"
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                      >
                        <CalendarPlus size={16} />
                      </button>
                      <button
                        onClick={() => handleSendWeeklyEmail(client)}
                        title="Envoyer le mail hebdomadaire"
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                      >
                        <Mail size={16} />
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
