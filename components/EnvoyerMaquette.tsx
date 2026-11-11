'use client'

import { useState } from 'react'

type Etape = 'ferme' | 'redaction' | 'apercu' | 'envoye'

// Bouton « Envoyer la maquette » : 1) rédiger / personnaliser, 2) vérifier l'aperçu exact, 3) valider l'envoi.
export default function EnvoyerMaquette({ prospect, onEnvoye }: { prospect: { id: number; nom: string; brouillon_email?: string }; onEnvoye: () => void }) {
  const [etape, setEtape] = useState<Etape>('ferme')
  const [to, setTo] = useState('')
  const [objet, setObjet] = useState('')
  const [message, setMessage] = useState('')
  const [apercu, setApercu] = useState('')
  const [erreur, setErreur] = useState('')
  const [occupe, setOccupe] = useState(false)

  const appeler = async (corps: object) => {
    setOccupe(true); setErreur('')
    try {
      const r = await fetch('/api/prospects/envoyer-maquette', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: prospect.id, ...corps }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErreur(j.error || 'Erreur'); return null }
      return j
    } finally { setOccupe(false) }
  }

  const ouvrir = async () => {
    const j = await appeler({})
    if (!j) { setEtape('redaction'); return }
    setObjet(j.objet); setMessage(j.message); setEtape('redaction')
  }
  const verifier = async () => {
    const j = await appeler({ to, objet, message })
    if (j) { setApercu(j.apercu); setEtape('apercu') }
  }
  const envoyer = async () => {
    const j = await appeler({ to, objet, message, confirme: true })
    if (j) { setEtape('envoye'); onEnvoye() }
  }
  const fermer = () => { setEtape('ferme'); setErreur('') }

  return (
    <>
      <button onClick={(e) => { e.stopPropagation(); ouvrir() }} className="text-xs px-2 py-1 bg-wine text-white rounded font-semibold">Envoyer la maquette</button>
      {etape !== 'ferme' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 cursor-default" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5 space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Maquette pour {prospect.nom}</h3>
              <button onClick={fermer} className="text-gray-500 text-xl leading-none" aria-label="Fermer">×</button>
            </div>

            {etape === 'redaction' && (
              <>
                <p className="text-gray-500">Étape 1 sur 3 : personnalisez le message. Vous verrez le mail exact avant l&apos;envoi.</p>
                <label className="block"><span className="font-semibold">Adresse du vigneron</span>
                  <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="contact@domaine.fr" className="w-full px-3 py-2 border rounded mt-1" /></label>
                <label className="block"><span className="font-semibold">Objet</span>
                  <input value={objet} onChange={(e) => setObjet(e.target.value)} className="w-full px-3 py-2 border rounded mt-1" /></label>
                <label className="block"><span className="font-semibold">Message</span>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={12} className="w-full px-3 py-2 border rounded mt-1" /></label>
                <p className="text-xs text-gray-500">La maquette (captures) et votre signature sont ajoutées automatiquement.</p>
                {prospect.brouillon_email && (
                  <button onClick={() => setMessage(prospect.brouillon_email!)} className="text-xs underline text-wine">Remplacer par le brouillon de Harness Maxxing</button>
                )}
                {erreur && <p className="text-red-600">{erreur}</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={fermer} className="px-3 py-2 border rounded">Annuler</button>
                  <button onClick={verifier} disabled={occupe || !to || !objet || !message} className="px-3 py-2 bg-wine text-white rounded disabled:opacity-50">{occupe ? '…' : 'Voir l\'aperçu'}</button>
                </div>
              </>
            )}

            {etape === 'apercu' && (
              <>
                <p className="text-gray-500">Étape 2 sur 3 : relisez. <b>Rien n&apos;est parti.</b></p>
                <p><b>À :</b> {to}<br /><b>Objet :</b> {objet}</p>
                <iframe title="Aperçu du mail" srcDoc={apercu} sandbox="" className="w-full h-[55vh] border rounded bg-gray-100" />
                {erreur && <p className="text-red-600">{erreur}</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEtape('redaction')} className="px-3 py-2 border rounded">Modifier</button>
                  <button onClick={envoyer} disabled={occupe} className="px-3 py-2 bg-wine text-white rounded disabled:opacity-50">{occupe ? 'Envoi…' : `Valider et envoyer à ${to}`}</button>
                </div>
              </>
            )}

            {etape === 'envoye' && (
              <>
                <p>✅ Mail envoyé à {to}. Le prospect passe à « Contacté » et l&apos;envoi est dans son historique.</p>
                <div className="flex justify-end"><button onClick={fermer} className="px-3 py-2 border rounded">Fermer</button></div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
