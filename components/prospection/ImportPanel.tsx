'use client'

import { useRef, useState } from 'react'
import { Btn, api } from './ui'

interface JobState { running: boolean; done: number; total: number; errors: number; msg: string }
const idle: JobState = { running: false, done: 0, total: 0, errors: 0, msg: '' }

function Progress({ j, onCancel }: { j: JobState; onCancel: () => void }) {
  if (!j.msg && !j.running) return null
  const p = j.total ? Math.min(100, (100 * j.done) / j.total) : j.running ? 5 : 100
  return (
    <div className="mt-3">
      <div className="h-2 bg-stone-100 rounded overflow-hidden"><i className="block h-full bg-wine transition-all" style={{ width: `${p}%` }} /></div>
      <div className="text-xs text-gray-500 mt-1.5">
        {j.msg} {j.running && j.total ? `· ${j.done.toLocaleString('fr-FR')}/${j.total.toLocaleString('fr-FR')}` : ''} {j.errors ? `· ${j.errors} erreur(s)` : ''}{' '}
        {j.running ? <button className="underline" onClick={onCancel}>annuler</button> : null}
      </div>
    </div>
  )
}

export default function ImportPanel({ cfg, onDone }: { cfg: any; onDone: () => void }) {
  const zoneDepts = Object.keys(cfg.zones)
  const [depts, setDepts] = useState<string[]>(zoneDepts)
  const [employerOnly, setEmployerOnly] = useState(true)
  const [withVinif, setWithVinif] = useState(true)
  const [discN, setDiscN] = useState('200')
  const [audN, setAudN] = useState('300')
  const [imp, setImp] = useState<JobState>(idle)
  const [disc, setDisc] = useState<JobState>(idle)
  const [aud, setAud] = useState<JobState>(idle)
  const cancel = useRef<Record<string, boolean>>({})
  const [rescoring, setRescoring] = useState(false)

  const toggle = (d: string) => setDepts((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))

  const runImport = async () => {
    if (!depts.length) return
    cancel.current.import = false
    let done = 0, errors = 0, total = 0
    setImp({ running: true, done: 0, total: 0, errors: 0, msg: 'Démarrage…' })
    for (const d of depts) {
      let page: number | null = 1
      while (page && !cancel.current.import) {
        try {
          const r: any = await api('/import', { dept: d, nafs: withVinif ? '01.21Z,11.02A,11.02B' : '01.21Z', employerOnly, page })
          if (r.error) throw new Error(r.error)
          if (page === 1) total += r.totalResults
          done += r.saved
          page = r.next
          setImp({ running: true, done, total, errors, msg: `Département ${d} (${cfg.dept_names[d]}) — page ${page ?? 'terminée'}` })
        } catch (e: any) {
          errors++
          setImp({ running: true, done, total, errors, msg: `Département ${d} : ${e.message}` })
          break
        }
      }
    }
    setImp({ running: false, done, total, errors, msg: `${cancel.current.import ? 'Import annulé.' : 'Import terminé.'} ${done.toLocaleString('fr-FR')} entreprises enregistrées.` })
    onDone()
  }

  const runBatch = async (kind: 'discover' | 'audit', limit: number, set: (j: JobState) => void) => {
    cancel.current[kind] = false
    set({ running: true, done: 0, total: 0, errors: 0, msg: 'Sélection des prospects…' })
    const pk: any = await api('/pick', { mode: kind === 'discover' ? 'no_url' : 'has_url', limit })
    const sirens: string[] = pk.sirens || []
    let done = 0, errors = 0, found = 0
    // 2 lots de 4 fiches en parallèle (la durée d'une fonction Vercel est limitée)
    const chunks: string[][] = []
    for (let i = 0; i < sirens.length; i += 4) chunks.push(sirens.slice(i, i + 4))
    let idx = 0
    const worker = async () => {
      while (idx < chunks.length && !cancel.current[kind]) {
        const c = chunks[idx++]
        try {
          const r: any = await api('/batch', { kind, sirens: c })
          errors += r.errors || 0; found += r.found || 0
        } catch { errors += c.length }
        done += c.length
        set({ running: true, done, total: sirens.length, errors, msg: kind === 'discover' ? `Recherche des sites… ${found} trouvé(s)` : 'Audit des sites…' })
      }
    }
    await Promise.all([worker(), worker()])
    set({ running: false, done, total: sirens.length, errors, msg: `${cancel.current[kind] ? 'Annulé.' : 'Terminé.'} ${done} fiches traitées${kind === 'discover' ? `, ${found} site(s) trouvé(s)` : ''}.` })
    onDone()
  }

  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => <div className="card"><h3 className="font-semibold mb-2">{title}</h3>{children}</div>
  return (
    <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(380px,1fr))]">
      <Card title="1 · Importer des domaines viticoles">
        <div className="text-xs text-gray-500 mb-1.5">Départements (zone La Gabare)</div>
        <div className="flex flex-wrap gap-1.5">
          {[...zoneDepts, '72', '85', '79'].map((d) => (
            <button key={d} onClick={() => toggle(d)} className={`px-2.5 py-0.5 rounded-full text-[13px] border ${depts.includes(d) ? 'bg-wine text-white border-wine' : 'bg-white border-gray-200'}`}>
              {d} {cfg.dept_names[d]}{zoneDepts.includes(d) ? '' : ' (hors zone)'}
            </button>
          ))}
        </div>
        <div className="my-3 space-y-1.5 text-sm">
          <label className="flex gap-2"><input type="checkbox" className="accent-[#722f37]" checked={employerOnly} onChange={(e) => setEmployerOnly(e.target.checked)} /><span>Employeurs uniquement <span className="text-gray-500">(recommandé : cible solvable, ~4× moins de fiches)</span></span></label>
          <label className="flex gap-2"><input type="checkbox" className="accent-[#722f37]" checked={withVinif} onChange={(e) => setWithVinif(e.target.checked)} /><span>Inclure vinification / vente de vin (NAF 11.02) en plus de la culture de la vigne (01.21)</span></label>
        </div>
        <Btn primary disabled={imp.running} onClick={runImport}>Lancer l&apos;import</Btn>
        <Progress j={imp} onCancel={() => { cancel.current.import = true }} />
        <p className="text-xs text-gray-500 mt-3">Source : API Recherche d&apos;entreprises (data.gouv.fr). Données publiques : effectif, CA publié, dirigeants, dates, certification bio. Ne fermez pas cette page pendant l&apos;import.</p>
      </Card>

      <Card title="2 · Détecter les sites web">
        <p className="text-sm text-gray-500 mb-3">Teste les noms de domaine probables (domaine-xxx.fr…), consulte OpenStreetMap et, si une clé est renseignée dans les réglages, Google Places. Une URL n&apos;est retenue que si la commune ou le code postal figure sur la page.</p>
        <div className="flex items-center gap-2 text-sm text-gray-500">Prospects (meilleurs scores d&apos;abord)
          <select className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-900" value={discN} onChange={(e) => setDiscN(e.target.value)}>{['50', '200', '500', '1000'].map((n) => <option key={n}>{n}</option>)}</select></div>
        <div className="mt-3"><Btn primary disabled={disc.running} onClick={() => runBatch('discover', +discN, setDisc)}>Lancer la détection</Btn></div>
        <Progress j={disc} onCancel={() => { cancel.current.discover = true }} />
        <div className="mt-3 text-sm bg-amber-50 text-amber-900 rounded-lg px-3 py-2">« Sans site » = non trouvé automatiquement. Confirmez dans la fiche (recherche Google en 1 clic) avant d&apos;écrire à un vigneron.</div>
      </Card>

      <Card title="3 · Auditer les sites">
        <p className="text-sm text-gray-500 mb-3">Analyse chaque site : HTTPS, mobile, ancienneté, technologie, SEO de base, boutique, vérification d&apos;âge, message loi Évin, réseaux sociaux, œnotourisme, email et téléphone.</p>
        <div className="flex items-center gap-2 text-sm text-gray-500">Sites à analyser
          <select className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-900" value={audN} onChange={(e) => setAudN(e.target.value)}>{['100', '300', '1000'].map((n) => <option key={n}>{n}</option>)}</select></div>
        <div className="mt-3"><Btn primary disabled={aud.running} onClick={() => runBatch('audit', +audN, setAud)}>Lancer l&apos;audit</Btn></div>
        <Progress j={aud} onCancel={() => { cancel.current.audit = true }} />
      </Card>

      <Card title="Base de données">
        <p className="text-sm text-gray-500 mb-3">Les prospects sont stockés dans Supabase (tables <code>prospects</code>, <code>prospect_activities</code>). Recalculez les scores après une modification des règles.</p>
        <Btn disabled={rescoring} onClick={async () => { setRescoring(true); await api('/rescore', {}); setRescoring(false); onDone() }}>{rescoring ? 'Recalcul…' : 'Recalculer tous les scores'}</Btn>
      </Card>
    </div>
  )
}
