'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

interface Dest { id: number; nom: string; appellation: string | null; commune: string | null; site: string | null; email: string; telephone: string | null; indices: string | null; statut: 'a_contacter' | 'envoye' | 'refus' | 'erreur'; envoye_le: string | null; erreur: string | null }
interface Etat { destinataires: Dest[]; aujourdhui: number; limite: number; restant: number }

const LIBELLE = { a_contacter: 'À contacter', envoye: 'Envoyé', refus: 'Refus', erreur: 'Erreur' } as const

async function appel(corps: object) {
  const r = await fetch('/api/campagne', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
  const j = await r.json().catch(() => ({}))
  return r.ok ? { j } : { erreur: (j.error as string) || 'Erreur' }
}

export default function CampagnePage() {
  const [etat, setEtat] = useState<Etat | null>(null)
  const [erreur, setErreur] = useState('')
  const [filtre, setFiltre] = useState<'a_contacter' | 'envoye' | 'refus' | 'tous'>('a_contacter')
  const [recherche, setRecherche] = useState('')
  const [ouvert, setOuvert] = useState<Dest | null>(null)

  const charger = useCallback(async () => {
    const r = await fetch('/api/campagne')
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { setErreur(j.error || 'Erreur'); return }
    setErreur(''); setEtat(j)
  }, [])
  useEffect(() => { charger() }, [charger])

  const liste = useMemo(() => (etat?.destinataires ?? []).filter((d) =>
    (filtre === 'tous' || d.statut === filtre || (filtre === 'a_contacter' && d.statut === 'erreur')) &&
    (!recherche || `${d.nom} ${d.commune} ${d.appellation}`.toLowerCase().includes(recherche.toLowerCase()))), [etat, filtre, recherche])

  const refuser = async (d: Dest) => {
    if (!confirm(`Marquer ${d.nom} comme refus ? Il ne sera plus jamais contacté.`)) return
    const r = await appel({ action: 'refus', id: d.id })
    if (r.erreur) setErreur(r.erreur); else charger()
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Campagne de présentation</h1>
        <p className="text-sm text-gray-500">Prospection par e-mail de domaines qui ne nous connaissent pas encore (ce n&apos;est pas la newsletter). Un mail à la fois, relu et validé par vous.</p>
      </div>
      {erreur && <p className="text-red-600">{erreur}</p>}
      {etat && (
        <>
          <div className="flex flex-wrap gap-3 items-center text-sm">
            <span className="px-3 py-1 rounded bg-gray-100">Aujourd&apos;hui : <b>{etat.aujourdhui}</b> / {etat.limite} (reste {etat.restant})</span>
            {(['a_contacter', 'envoye', 'refus', 'tous'] as const).map((f) => (
              <button key={f} onClick={() => setFiltre(f)} className={`px-3 py-1 rounded border ${filtre === f ? 'bg-wine text-white' : ''}`}>
                {f === 'tous' ? 'Tous' : LIBELLE[f]} ({etat.destinataires.filter((d) => f === 'tous' || d.statut === f).length})
              </button>
            ))}
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher" className="px-3 py-2 md:py-1 border rounded w-full md:w-auto" />
          </div>
          <div className="md:hidden space-y-3">
            {liste.map((d) => (
              <div key={d.id} className="border rounded-lg bg-white p-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0"><b>{d.nom}</b><br /><span className="text-gray-500">{[d.commune, d.appellation].filter(Boolean).join(' · ')}</span><br /><span className="text-gray-500 break-all">{d.email}</span></div>
                  <span className="text-xs shrink-0 text-gray-600">{LIBELLE[d.statut]}{d.envoye_le && <><br />{new Date(d.envoye_le).toLocaleDateString('fr-FR')}</>}</span>
                </div>
                {d.site && <a href={d.site} target="_blank" rel="noreferrer" className="text-wine underline text-xs break-all">{d.site}</a>}
                {d.indices && <details className="text-xs text-gray-600"><summary className="cursor-pointer">Indices</summary><p className="mt-1">{d.indices}</p></details>}
                <div className="flex gap-2">
                  {(d.statut === 'a_contacter' || d.statut === 'erreur') && <button onClick={() => setOuvert(d)} className="flex-1 py-3 bg-wine text-white rounded font-semibold">Écrire</button>}
                  {d.statut !== 'refus' && <button onClick={() => refuser(d)} className="px-4 py-3 border rounded">Refus</button>}
                </div>
              </div>
            ))}
            {!liste.length && <p className="p-4 text-center text-gray-500">Aucun destinataire.</p>}
          </div>
          <div className="hidden md:block overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left"><tr><th className="p-2">Domaine</th><th className="p-2">Appellation</th><th className="p-2">Indices</th><th className="p-2">Statut</th><th className="p-2"></th></tr></thead>
              <tbody>
                {liste.map((d) => (
                  <tr key={d.id} className="border-t align-top">
                    <td className="p-2"><b>{d.nom}</b><br /><span className="text-gray-500">{d.commune} · {d.email}</span>{d.site && <><br /><a href={d.site} target="_blank" rel="noreferrer" className="text-wine underline">site</a></>}</td>
                    <td className="p-2">{d.appellation}</td>
                    <td className="p-2 text-xs text-gray-600 max-w-xs">{d.indices}</td>
                    <td className="p-2">{LIBELLE[d.statut]}{d.envoye_le && <><br /><span className="text-xs text-gray-500">{new Date(d.envoye_le).toLocaleDateString('fr-FR')}</span></>}</td>
                    <td className="p-2 whitespace-nowrap space-x-2">
                      {(d.statut === 'a_contacter' || d.statut === 'erreur') && <button onClick={() => setOuvert(d)} className="text-xs px-2 py-1 bg-wine text-white rounded font-semibold">Écrire</button>}
                      {d.statut !== 'refus' && <button onClick={() => refuser(d)} className="text-xs px-2 py-1 border rounded">Refus</button>}
                    </td>
                  </tr>
                ))}
                {!liste.length && <tr><td colSpan={5} className="p-4 text-center text-gray-500">Aucun destinataire.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
      {ouvert && etat && <Redaction d={ouvert} restant={etat.restant} onFermer={() => { setOuvert(null); charger() }} />}
    </div>
  )
}

function Redaction({ d, restant, onFermer }: { d: Dest; restant: number; onFermer: () => void }) {
  const [etape, setEtape] = useState<'redaction' | 'apercu' | 'envoye'>('redaction')
  const [objet, setObjet] = useState('')
  const [message, setMessage] = useState('')
  const [apercu, setApercu] = useState('')
  const [moi, setMoi] = useState('')
  const [info, setInfo] = useState('')
  const [erreur, setErreur] = useState('')
  const [occupe, setOccupe] = useState(false)

  useEffect(() => { appel({ action: 'proposition', id: d.id }).then((r) => { if (r.j) { setObjet(r.j.objet); setMessage(r.j.message) } else setErreur(r.erreur!) }) }, [d.id])

  const lancer = async (corps: object, suite: (j: Record<string, string>) => void) => {
    setOccupe(true); setErreur(''); setInfo('')
    const r = await appel(corps)
    setOccupe(false)
    if (r.erreur) setErreur(r.erreur); else suite(r.j)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-stretch sm:items-center justify-center sm:p-4">
      <div className="bg-white sm:rounded-lg w-full max-w-3xl h-[100dvh] sm:h-auto sm:max-h-[92vh] overflow-y-auto p-4 sm:p-5 space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold">Présentation pour {d.nom}</h3>
          <button onClick={onFermer} className="text-gray-500 text-xl leading-none" aria-label="Fermer">×</button>
        </div>
        <p className="text-gray-500">À : {d.email} · Il reste {restant} envoi(s) aujourd&apos;hui.</p>

        {etape === 'redaction' && (
          <>
            <label className="block"><span className="font-semibold">Objet</span>
              <input value={objet} onChange={(e) => setObjet(e.target.value)} className="w-full px-3 py-2 border rounded mt-1 text-base sm:text-sm" /></label>
            <label className="block"><span className="font-semibold">Message</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={13} className="w-full px-3 py-2 border rounded mt-1 text-base sm:text-sm" /></label>
            <p className="text-xs text-gray-500">Remplacez la phrase entre crochets par une phrase personnelle. Les boutons (site, audit gratuit), la mention « stop » et votre signature sont ajoutés automatiquement.</p>
            {erreur && <p className="text-red-600">{erreur}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end sticky bottom-0 bg-white pt-2 pb-[env(safe-area-inset-bottom)] [&>button]:py-3 sm:[&>button]:py-2">
              <button onClick={onFermer} className="px-3 py-2 border rounded">Annuler</button>
              <button onClick={() => lancer({ action: 'apercu', objet, message }, (j) => { setApercu(j.apercu); setEtape('apercu') })} disabled={occupe || !objet || !message} className="px-3 py-2 bg-wine text-white rounded disabled:opacity-50">Voir l&apos;aperçu</button>
            </div>
          </>
        )}

        {etape === 'apercu' && (
          <>
            <p className="text-gray-500"><b>Rien n&apos;est parti.</b> Objet : {objet}</p>
            <iframe title="Aperçu du mail" srcDoc={apercu} sandbox="" className="w-full h-[58dvh] sm:h-[50vh] border rounded bg-gray-100" />
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input type="email" value={moi} onChange={(e) => setMoi(e.target.value)} placeholder="Votre adresse pour un test" className="flex-1 px-3 py-3 sm:py-2 border rounded text-base sm:text-sm" />
              <button onClick={() => lancer({ action: 'test', to: moi, objet, message }, () => setInfo(`Test envoyé à ${moi}`))} disabled={occupe || !moi} className="px-3 py-2 border rounded disabled:opacity-50">M&apos;envoyer un test</button>
            </div>
            {info && <p className="text-green-700">{info}</p>}
            {erreur && <p className="text-red-600">{erreur}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end sticky bottom-0 bg-white pt-2 pb-[env(safe-area-inset-bottom)] [&>button]:py-3 sm:[&>button]:py-2">
              <button onClick={() => setEtape('redaction')} className="px-3 py-2 border rounded">Modifier</button>
              <button onClick={() => lancer({ action: 'envoyer', id: d.id, objet, message, confirme: true }, () => setEtape('envoye'))} disabled={occupe} className="px-3 py-2 bg-wine text-white rounded disabled:opacity-50">{occupe ? 'Envoi…' : `Valider et envoyer à ${d.email}`}</button>
            </div>
          </>
        )}

        {etape === 'envoye' && (
          <>
            <p>✅ Mail envoyé à {d.email}.</p>
            <div className="flex justify-end"><button onClick={onFermer} className="px-3 py-2 border rounded">Fermer</button></div>
          </>
        )}
      </div>
    </div>
  )
}
