'use client'

import { useEffect, useState } from 'react'
import Dashboard from '@/components/prospection/Dashboard'
import Drawer from '@/components/prospection/Drawer'
import ImportPanel from '@/components/prospection/ImportPanel'
import Leads, { DEFAULT_FILTERS, Filters, PRESETS } from '@/components/prospection/Leads'
import { DueList, PipelineBoard } from '@/components/prospection/Pipeline'
import SettingsPanel from '@/components/prospection/SettingsPanel'
import { api } from '@/components/prospection/ui'

const TABS: [string, string][] = [
  ['dash', 'Tableau de bord'], ['leads', 'Prospects'], ['pipe', 'Pipeline'], ['due', 'Relances'], ['imp', 'Import & audit'], ['set', 'Méthode & réglages'],
]

export default function ProspectionPage() {
  const [cfg, setCfg] = useState<any>(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('dash')
  const [F, setF] = useState<Filters>({ ...DEFAULT_FILTERS })
  const [open, setOpen] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    api('/config').then((d) => { if (d.error) setErr(d.error); else setCfg(d) }).catch((e) => setErr(e.message))
  }, [])

  const bump = () => setRefresh((n) => n + 1)
  const preset = (k: string) => { setF(JSON.parse(JSON.stringify(PRESETS[k].f))); setTab('leads') }

  return (
    <div className="container-dashboard">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Prospection</h1>
        <p className="text-gray-500 text-sm">Repérez, qualifiez et suivez les vignerons de la Loire à démarcher.</p>
      </div>

      {err ? (
        <div className="card text-red-700">
          Impossible de charger le module : {err}
          <div className="text-sm text-gray-600 mt-2">Vérifiez que les tables ont bien été créées : exécutez <code>sql/create_prospection.sql</code> dans l&apos;éditeur SQL de Supabase.</div>
        </div>
      ) : !cfg ? <div className="text-gray-500">Chargement…</div> : (
        <>
          <div className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto">
            {TABS.map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${tab === k ? 'border-wine text-wine font-semibold' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                {l}{k === 'due' && stats?.due ? <span className="ml-1.5 bg-red-600 text-white rounded-full text-[11px] px-1.5">{stats.due}</span> : null}
              </button>
            ))}
          </div>
          {tab === 'dash' && <Dashboard cfg={cfg} onOpen={setOpen} onPreset={preset} goImport={() => setTab('imp')} onStats={setStats} key={`d${refresh}`} />}
          {tab === 'leads' && <Leads cfg={cfg} F={F} setF={setF} onOpen={setOpen} refreshKey={refresh} />}
          {tab === 'pipe' && <PipelineBoard onOpen={setOpen} refreshKey={refresh} />}
          {tab === 'due' && <DueList cfg={cfg} onOpen={setOpen} refreshKey={refresh} />}
          {tab === 'imp' && <ImportPanel cfg={cfg} onDone={bump} />}
          {tab === 'set' && <SettingsPanel cfg={cfg} onSaved={(s) => setCfg({ ...cfg, settings: s })} />}
          {open && <Drawer siren={open} cfg={cfg} onClose={() => setOpen(null)} onChanged={bump} />}
        </>
      )}
    </div>
  )
}
