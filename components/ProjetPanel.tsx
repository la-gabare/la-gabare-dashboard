'use client'

import { useState } from 'react'
import { Client } from '@/lib/types'
import { listeContenus, EtatContenu } from '@/lib/contenus-defs'

type ClientProjet = Client & {
  maquette_url?: string | null
  maquette_statut?: 'a_valider' | 'corrections' | 'validee' | null
  maquette_commentaire?: string | null
  maquette_soumise_at?: string | null
  maquette_validee_at?: string | null
  mis_en_ligne_at?: string | null
  accueil_envoye_at?: string | null
  contenus?: Record<string, EtatContenu> | null
  contenus_limite?: string | null
  contenus_relances?: number
}

const date = (d?: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '')

export default function ProjetPanel({ client, onChange }: { client: ClientProjet; onChange: () => void }) {
  const [maquette, setMaquette] = useState(client.maquette_url || '')
  const [site, setSite] = useState(client.site_url || (client.domaine ? `https://${client.domaine}` : ''))
  const [occupe, setOccupe] = useState(false)

  const action = async (body: Record<string, unknown>, confirmation: string) => {
    if (!confirm(confirmation)) return
    setOccupe(true)
    try {
      const res = await fetch('/api/projet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: client.id, ...body }),
      })
      const data = await res.json()
      if (!res.ok) alert('Erreur : ' + data.error)
      else if (data.versement_envoye) alert('Le lien du versement suivant a été envoyé au client.')
      onChange()
    } finally {
      setOccupe(false)
    }
  }

  const statut = client.maquette_statut
  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-1">Projet du site</h2>
      <p className="text-sm text-gray-500 mb-4">
        Quand le client valide sa maquette (depuis son espace), le 2e versement part tout seul. À la mise en ligne, le dernier versement part aussi.
      </p>

      <div className="space-y-4">
        {client.accueil_envoye_at && !client.mis_en_ligne_at && (() => {
          const items = listeContenus(client)
          const faits = items.filter((i) => i.etat).length
          return (
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                Contenus du vigneron
                <span className={`badge ${faits === items.length ? 'badge-success' : 'badge-warning'}`}>{faits}/{items.length} fournis</span>
                {client.contenus_limite && faits < items.length && (
                  <span className="text-xs text-gray-500">souhaités avant le {date(client.contenus_limite)}{client.contenus_relances ? ` · ${client.contenus_relances} relance(s)` : ''}</span>
                )}
              </div>
              <div className="space-y-1">
                {items.map((i) => (
                  <div key={i.cle} className="border rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 font-medium">{i.libelle}</span>
                      <span className={`badge ${i.etat?.statut === 'valide' ? 'badge-success' : i.etat ? 'badge-info' : ''}`}>
                        {i.etat?.statut === 'valide' ? 'Validé' : i.etat ? `Fourni le ${date(i.etat.fourni_at)}` : 'À fournir'}
                      </span>
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={i.etat?.statut === 'valide'} disabled={occupe}
                          onChange={(e) => action({ action: 'contenu_valider', cle: i.cle, valide: e.target.checked },
                            e.target.checked ? `Valider « ${i.libelle} » ?` : `Remettre « ${i.libelle} » en « à fournir » ?`)} />
                        Validé
                      </label>
                    </div>
                    {i.etat?.texte && <p className="mt-1 text-gray-600 whitespace-pre-wrap">{i.etat.texte}</p>}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        <div>
          <div className="flex items-center gap-2 mb-2 text-sm font-medium">
            Maquette
            {statut === 'a_valider' && <span className="badge badge-warning">En attente du client depuis le {date(client.maquette_soumise_at)}</span>}
            {statut === 'corrections' && <span className="badge badge-danger">Corrections demandées</span>}
            {statut === 'validee' && <span className="badge badge-success">Validée le {date(client.maquette_validee_at)}</span>}
          </div>
          {statut === 'corrections' && client.maquette_commentaire && (
            <blockquote className="text-sm whitespace-pre-wrap border-l-4 border-yellow-400 bg-yellow-50 px-3 py-2 mb-2">{client.maquette_commentaire}</blockquote>
          )}
          {statut !== 'validee' && (
            <div className="flex flex-wrap gap-2">
              <input type="url" placeholder="https://… (lien de la maquette ou du site de préproduction)" value={maquette}
                onChange={(e) => setMaquette(e.target.value)} className="flex-1 min-w-[260px] px-3 py-2 border rounded-lg text-sm" />
              <button disabled={occupe || !maquette} className="btn-primary text-sm disabled:opacity-50"
                onClick={() => action({ action: 'soumettre_maquette', url: maquette },
                  `${statut ? 'Renvoyer' : 'Envoyer'} la maquette à ${client.email_contact} pour validation ?`)}>
                {statut ? 'Renvoyer la maquette corrigée' : 'Envoyer la maquette au client'}
              </button>
              {statut && (
                <button disabled={occupe} className="text-xs px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                  onClick={() => action({ action: 'valider_maquette' }, 'Le client a validé la maquette par téléphone ou par mail ? Le versement suivant lui sera envoyé.')}>
                  Validée hors ligne
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2 text-sm font-medium">
            Mise en ligne
            {client.mis_en_ligne_at && <span className="badge badge-success">En ligne depuis le {date(client.mis_en_ligne_at)}</span>}
          </div>
          {!client.mis_en_ligne_at && (
            <div className="flex flex-wrap gap-2">
              <input type="url" placeholder="https://www.domaine.fr" value={site} onChange={(e) => setSite(e.target.value)}
                className="flex-1 min-w-[260px] px-3 py-2 border rounded-lg text-sm" />
              <button disabled={occupe || !site} className="btn-primary text-sm disabled:opacity-50"
                onClick={() => action({ action: 'mise_en_ligne', url: site },
                  `Déclarer le site en ligne (${site}) ? Le client reçoit un mail et le lien du dernier versement.`)}>
                Le site est en ligne
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
