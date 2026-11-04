'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import CreateClientModal from '@/components/CreateClientModal'
import type { Lead } from '@/lib/types'

// Prospection « push » : même bouton « Client + devis » que pour un lead du formulaire.
// Crée le client, le rattache au prospect (stade « Client ») puis ouvre sa fiche sur le devis.
export default function ConvertirProspect({ prospect }: { prospect: { id: number; nom: string; appellation?: string } }) {
  const router = useRouter()
  const [ouvert, setOuvert] = useState(false)
  const source: Partial<Lead> = { nom: prospect.nom, domaine: prospect.nom, appellation: prospect.appellation }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOuvert(true) }}
        title="Le vigneron a accepté : créer le client et préparer son devis"
        className="flex items-center space-x-1 text-xs px-2 py-1 rounded text-white hover:opacity-90"
        style={{ backgroundColor: '#B08D57' }}
      >
        <UserPlus size={14} />
        <span>Client + devis</span>
      </button>
      {ouvert && (
        <CreateClientModal
          lead={source as Lead}
          onClose={() => setOuvert(false)}
          onCreated={async (c) => {
            await fetch('/api/prospects/lier', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'client', id: c.id, prospect_id: prospect.id, lier: true }),
            }).catch(() => {})
            await fetch('/api/prospects', {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: prospect.id, stade: 'client' }),
            }).catch(() => {})
            router.push(`/clients/${c.id}?devis=1`)
          }}
        />
      )}
    </>
  )
}
