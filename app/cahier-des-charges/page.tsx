'use client'

import { useEffect, useState } from 'react'
import { fetchAdminData } from '@/lib/admin-data'
import { CahierDesCharges } from '@/lib/types'

export default function CahierDesChargesPage() {
  const [cahiers, setCahiers] = useState<CahierDesCharges[]>([])
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState<number | null>(null)

  const fetchCahiers = async () => {
    setLoading(true)
    const data = await fetchAdminData<CahierDesCharges>('cahier_des_charges', {
      order_column: 'created_at',
      order_asc: 'false',
    })
    setCahiers(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchCahiers()
  }, [])

  const markTraite = async (id: number, traite: boolean) => {
    await fetch('/api/cahier-des-charges', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, traite }),
    })
    fetchCahiers()
  }

  const convertToClient = async (cahier: CahierDesCharges) => {
    if (!cahier.email) {
      alert('Ce cahier des charges n\'a pas d\'email, impossible de créer le client')
      return
    }
    setConverting(cahier.id)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cahier_id: cahier.id,
          nom_domaine: cahier.nom_domaine || 'À définir',
          email_contact: cahier.email,
          appellation: cahier.appellation,
          abonnement: 'village',
          statut: 'actif',
          date_debut_abonnement: new Date().toISOString(),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert('Erreur: ' + err.error)
        return
      }
      await markTraite(cahier.id, true)
      alert('Client créé avec succès')
    } finally {
      setConverting(null)
    }
  }

  return (
    <div className="container-dashboard">
      <h1 className="text-3xl font-bold mb-8">Cahiers des charges (création de site)</h1>

      <div className="card">
        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : cahiers.length === 0 ? (
          <p className="text-gray-500">Aucun cahier des charges</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Domaine</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Pack</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cahiers.map((cahier) => (
                  <tr key={cahier.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{cahier.nom_domaine || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="badge badge-info">{cahier.pack_choisi || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">{cahier.nom_contact || '-'}</td>
                    <td className="px-4 py-3 text-sm">{cahier.email || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${cahier.traite ? 'badge-success' : 'badge-warning'}`}>
                        {cahier.traite ? 'Traité' : 'À traiter'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex space-x-2">
                      {!cahier.traite && (
                        <>
                          <button
                            onClick={() => convertToClient(cahier)}
                            disabled={converting === cahier.id}
                            className="btn-primary text-sm py-1 disabled:opacity-50"
                          >
                            {converting === cahier.id ? 'Création...' : 'Créer le client'}
                          </button>
                          <button
                            onClick={() => markTraite(cahier.id, true)}
                            className="text-sm py-1 px-3 rounded-lg bg-gray-200 hover:bg-gray-300"
                          >
                            Ignorer
                          </button>
                        </>
                      )}
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
