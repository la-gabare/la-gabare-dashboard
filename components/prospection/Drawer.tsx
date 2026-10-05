'use client'

import { ReactNode, useEffect, useState } from 'react'
import { Btn, Prio, SITE, Tag, addDays, api, eurFull, inputCls } from './ui'

const Box = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-3.5 mb-3">
    <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2.5">{title}</h4>
    {children}
  </div>
)

const Ck = ({ state, children }: { state: boolean | null | undefined; children: ReactNode }) => (
  <div className="flex gap-1.5 items-start text-[13px]">
    <b className={`w-4 text-center shrink-0 ${state === true ? 'text-green-700' : state === false ? 'text-red-700' : 'text-gray-400'}`}>{state === true ? '✓' : state === false ? '✕' : '•'}</b>
    <span>{children}</span>
  </div>
)

const SCORE_PARTS: Record<string, [string, number]> = {
  site: ['Besoin de site', 35], communication: ['Communication', 20], capacite: ['Capacité à investir', 25], timing: ['Timing / expansion', 20],
}

export default function Drawer({ siren, cfg, onClose, onChanged }: { siren: string; cfg: any; onClose: () => void; onChanged: () => void }) {
  const [L, setL] = useState<any>(null)
  const [msg, setMsg] = useState<any>(null)
  const [tab, setTab] = useState<'email' | 'call'>('email')
  const [f, setF] = useState<any>({})
  const [busy, setBusy] = useState('')
  const [toast, setToast] = useState('')
  const [note, setNote] = useState({ text: '', kind: 'note' })

  const say = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2500) }
  const load = async () => {
    const d = await api(`/lead/${siren}`)
    setL(d); setMsg(null)
    setF({ status: d.status, next: d.next_action || '', email: d.email || '', phone: d.phone || '', notes: d.notes || '', url: d.url || '' })
    api(`/message/${siren}`).then(setMsg)
  }
  useEffect(() => { setL(null); load() }, [siren])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [])

  const run = async (name: string, fn: () => Promise<any>) => {
    setBusy(name)
    try { await fn() } catch (e: any) { say(e.message) } finally { setBusy('') }
  }
  const apply = (d: any) => {
    setL(d)
    setF({ status: d.status, next: d.next_action || '', email: d.email || '', phone: d.phone || '', notes: d.notes || '', url: d.url || '' })
    onChanged()
  }
  const save = (extra: any = {}) => run('save', async () => {
    const d = await api(`/lead/${siren}`, { status: f.status, next_action: f.next || null, email: f.email.trim(), phone: f.phone.trim(), notes: f.notes, ...extra })
    apply(d)
  })

  if (!L) return <Shell onClose={onClose}><div className="p-6 text-gray-500">Chargement…</div></Shell>
  const A = L.audit, bd = L.breakdown || {}, soc = L.socials || {}
  const [siteLabel, siteTone] = SITE[L.site_status] || ['?', '']
  const q = `${L.brand || L.name} ${L.commune || ''}`
  const g = encodeURIComponent
  const mailto = `mailto:${encodeURIComponent(L.email || '')}?subject=${g(msg?.subject || '')}&body=${g(msg?.body || '')}`
  const text = msg ? (tab === 'email' ? `Objet : ${msg.subject}\n\n${msg.body}` : msg.call) : 'Chargement…'

  return (
    <Shell onClose={onClose}>
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-4">
        <button className="absolute right-4 top-3 text-2xl text-gray-400 hover:text-gray-700" onClick={onClose} aria-label="Fermer">×</button>
        <h2 className="text-lg font-bold pr-8">{L.brand || L.name}</h2>
        <div className="text-xs text-gray-500">{L.name} · SIREN {L.siren}</div>
        <div className="mt-2 flex gap-1.5 flex-wrap items-center">
          <Prio p={L.prio} /><b className="text-lg">{Math.round(L.score)}/100</b>
          <Tag tone={siteTone}>{siteLabel}{L.site_status === 'aucun' && L.url_source !== 'manual' ? ' (à confirmer)' : ''}</Tag>
          {L.pack ? <Tag tone="wine">Pack {L.pack}</Tag> : null}<Tag>Abo {L.abo}</Tag><Tag tone="ok">{eurFull(L.deal)} 1re année</Tag>
        </div>
      </div>

      <div className="px-5 py-4">
        <Box title="Suivi commercial">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-gray-500">Statut
              <select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{cfg.statuses.map((s: string) => <option key={s}>{s}</option>)}</select></label>
            <label className="text-xs text-gray-500">Prochaine action
              <input type="date" className={inputCls} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></label>
            <label className="text-xs text-gray-500">Email
              <input className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
            <label className="text-xs text-gray-500">Téléphone
              <input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
          </div>
          <div className="mt-2 flex gap-1.5 flex-wrap">
            <Btn small primary onClick={() => save().then(() => say('Enregistré'))} disabled={busy === 'save'}>Enregistrer</Btn>
            {[3, 7, 30].map((n) => <Btn key={n} small onClick={() => { setF({ ...f, next: addDays(n) }); save({ next_action: addDays(n) }).then(() => say('Relance programmée')) }}>{n === 3 ? 'Relance +3 j' : `+${n} j`}</Btn>)}
          </div>
          <div className="text-xs text-gray-500 mt-1.5">{L.last_contact ? `Dernier contact : ${L.last_contact}` : 'Jamais contacté'}</div>
        </Box>

        <Box title="Site web">
          <div className="flex gap-1.5">
            <input className={inputCls} placeholder="https://…" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
            <Btn disabled={!!busy} onClick={() => run('audit', async () => { await api(`/lead/${siren}`, { url: f.url.trim() }); apply(await api(`/lead/${siren}/audit`, {})) })}>{busy === 'audit' ? '…' : 'Auditer'}</Btn>
          </div>
          <div className="flex gap-1.5 flex-wrap my-2">
            <Btn small disabled={!!busy} onClick={() => run('disc', async () => { const d = await api(`/lead/${siren}/discover`, {}); apply(d); say(d._discover === 'found' ? 'Site trouvé' : 'Aucun site trouvé automatiquement') })}>{busy === 'disc' ? '…' : 'Détecter automatiquement'}</Btn>
            <Btn small disabled={!!busy} onClick={() => run('nosite', async () => { apply(await api(`/lead/${siren}/nosite`, {})); say('Absence de site confirmée') })}>Confirmer : aucun site</Btn>
            {L.url ? <Btn small disabled={!!busy} onClick={() => run('psi', async () => { const d = await api(`/lead/${siren}/psi`, {}); if (d._error) say(`PageSpeed : ${String(d._error).slice(0, 80)}`); apply(d) })}>{busy === 'psi' ? '…' : 'PageSpeed mobile'}</Btn> : null}
            {L.url ? <a className="px-2.5 py-1 text-[13px] rounded-lg border border-gray-200 bg-white hover:bg-gray-50" target="_blank" rel="noopener noreferrer" href={L.url.startsWith('http') ? L.url : `https://${L.url}`}>Ouvrir ↗</a> : null}
          </div>
          {L.url_source === 'auto' && L.url ? <div className="text-xs text-gray-500 mb-1.5">URL détectée automatiquement — vérifiez que c&apos;est bien le bon domaine.</div> : null}
          {L.site_status === 'inconnu' && !L.url ? <div className="text-sm bg-blue-50 text-blue-900 rounded-lg px-3 py-2 mb-2">Site non vérifié : cliquez « Détecter automatiquement » (ou saisissez l&apos;URL) avant de contacter, pour personnaliser le message.</div> : null}
          {L.site_status === 'aucun' && L.url_source !== 'manual' ? <div className="text-sm bg-amber-50 text-amber-900 rounded-lg px-3 py-2 mb-2">Aucun site n&apos;a été trouvé automatiquement. Vérifiez avec les recherches ci-dessous avant de contacter, puis cliquez « Confirmer : aucun site ».</div> : null}
          {!A ? <div className="text-sm text-gray-500">{L.url ? 'Site non audité.' : 'Aucune URL.'}</div> : A.error ? <div className="text-sm bg-amber-50 text-amber-900 rounded-lg px-3 py-2">{A.error}</div> : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <Ck state={A.https}>HTTPS</Ck><Ck state={A.viewport}>Adapté mobile</Ck><Ck state={A.meta_desc}>Meta description</Ck><Ck state={A.og}>Aperçu de partage (OG)</Ck>
                <Ck state={A.shop}>Vente en ligne</Ck><Ck state={A.age_gate}>Vérification d&apos;âge</Ck><Ck state={A.sanitary}>Message sanitaire (Évin)</Ck><Ck state={A.blog}>Blog / actualités</Ck>
                <Ck state={A.tourism}>Œnotourisme / visites</Ck><Ck state={A.tourism ? A.booking : null}>Réservation en ligne</Ck><Ck state={A.lang_en}>Version anglaise</Ck><Ck state={A.schema_org}>Données structurées</Ck>
              </div>
              <div className="grid grid-cols-[130px_1fr] gap-y-1 text-[13px] mt-3">
                <span className="text-gray-500">Technologie</span><span>{A.cms || A.generator || 'Sur-mesure / inconnue'}</span>
                <span className="text-gray-500">Copyright</span><span>{A.copyright_year || 'non indiqué'}</span>
                <span className="text-gray-500">Chargement</span><span>{A.load_s} s · {A.size_kb} Ko</span>
                {A.psi ? (<><span className="text-gray-500">PageSpeed mobile</span><span><b>{A.psi.perf}/100</b> · LCP {A.psi.lcp || '—'}</span></>) : null}
              </div>
              {A.issues?.length ? <div className="mt-2.5 space-y-0.5">{A.issues.map((i: string) => <Ck key={i} state={false}>{i}</Ck>)}</div> : null}
            </>
          )}
          {Object.keys(soc).length ? <div className="mt-2.5 text-sm">Réseaux : {Object.entries(soc).map(([k, v]) => <a key={k} className="inline-block mr-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700" target="_blank" rel="noopener noreferrer" href={String(v).startsWith('http') ? String(v) : `https://${v}`}>{k}</a>)}</div> : null}
          {L.gbp?.found ? <div className="mt-2 text-sm">Fiche Google : <b>{L.gbp.rating || '—'}★</b> · {L.gbp.reviews || 0} avis{L.gbp.website ? '' : ' · '}{L.gbp.website ? null : <Tag tone="hot">pas de site sur la fiche</Tag>}</div> : null}
        </Box>

        <Box title="Pourquoi ce score">
          {Object.entries(SCORE_PARTS).map(([k, [label, m]]) => (
            <div key={k} className="flex items-center gap-2 my-1 text-[13px]">
              <span className="w-36 text-gray-500">{label}</span>
              <div className="flex-1 h-1.5 bg-stone-200 rounded overflow-hidden"><i className="block h-full bg-wine" style={{ width: `${(100 * (bd[k] || 0)) / m}%` }} /></div>
              <span className="w-10 text-right">{bd[k] || 0}/{m}</span>
            </div>
          ))}
          {bd.qualite && bd.qualite < 1 ? <div className="text-xs text-gray-500">Pondération qualité : ×{bd.qualite} (structure peu qualifiée)</div> : null}
          <div className="mt-2 flex flex-wrap gap-1">{(L.signals || []).map((s: any) => <Tag key={s.k} tone={s.tone}>{s.label}</Tag>)}</div>
          {L.pitch?.length ? <div className="mt-2.5"><b className="text-sm">Arguments à utiliser</b>{L.pitch.map((p: string) => <Ck key={p} state>{p}</Ck>)}</div> : null}
        </Box>

        <Box title="Message recommandé">
          <div className="flex gap-1 mb-2">
            {(['email', 'call'] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`px-2.5 py-1 rounded-md text-sm ${tab === t ? 'bg-wine/10 text-wine font-semibold' : 'text-gray-500'}`}>{t === 'email' ? 'Email' : "Script d'appel"}</button>)}
          </div>
          <div className="whitespace-pre-wrap bg-stone-50 border border-gray-200 rounded-lg p-3 text-[13px] max-h-72 overflow-auto">{text}</div>
          <div className="mt-2 flex gap-1.5 flex-wrap">
            <Btn small onClick={async () => { await navigator.clipboard.writeText(text); say('Copié') }}>Copier</Btn>
            <a className="px-2.5 py-1 text-[13px] rounded-lg border border-gray-200 bg-white hover:bg-gray-50" href={mailto}>Ouvrir dans ma messagerie</a>
            <Btn small disabled={!!busy} onClick={() => run('log', async () => {
              await api(`/lead/${siren}/note`, { kind: 'email', text: 'Email de prospection envoyé' })
              apply(await api(`/lead/${siren}`, ['Nouveau', 'À contacter'].includes(L.status) ? { status: 'Contacté', next_action: addDays(5) } : {}))
              say('Enregistré — relance dans 5 jours')
            })}>Marquer « email envoyé »</Btn>
          </div>
        </Box>

        <Box title="Identité">
          <div className="grid grid-cols-[130px_1fr] gap-y-1 text-[13px]">
            <span className="text-gray-500">Dirigeant</span><span>{L.dirigeant || '—'}{L.dir_birth ? ` (${cfg.year - L.dir_birth} ans)` : ''}</span>
            <span className="text-gray-500">Adresse</span><span>{L.address || '—'}</span>
            <span className="text-gray-500">Forme / NAF</span><span>{L.legal} · {L.naf}</span>
            <span className="text-gray-500">Création</span><span>{L.created || '—'}</span>
            <span className="text-gray-500">Effectif</span><span>{L.eff_label}</span>
            <span className="text-gray-500">CA</span><span>{L.ca ? `${eurFull(L.ca)} (${L.ca_year})` : 'non publié'}{L.ca_prev ? ` · précédent ${eurFull(L.ca_prev)}` : ''}</span>
            <span className="text-gray-500">Établissements</span><span>{L.nb_open || 1} ouvert(s) / {L.nb_etab || 1}</span>
            <span className="text-gray-500">Zone</span><span>{L.zone} — {cfg.dept_names[L.dept] || L.dept}</span>
          </div>
          <div className="mt-2.5 flex gap-1.5 flex-wrap">
            {[
              ['Chercher sur Google ↗', `https://www.google.com/search?q=${g(`"${L.brand || L.name}" ${L.commune || ''} vin`)}`],
              ['Google Maps ↗', `https://www.google.com/maps/search/${g(q)}`],
              ['Facebook ↗', `https://www.facebook.com/search/top?q=${g(q)}`],
              ['Instagram ↗', `https://www.instagram.com/explore/search/keyword/?q=${g(L.brand || L.name)}`],
              ['Fiche officielle ↗', `https://annuaire-entreprises.data.gouv.fr/entreprise/${L.siren}`],
            ].map(([l, h]) => <a key={l} className="px-2.5 py-1 text-[13px] rounded-lg border border-gray-200 bg-white hover:bg-gray-50" target="_blank" rel="noopener noreferrer" href={h}>{l}</a>)}
          </div>
        </Box>

        <Box title="Notes & historique">
          <textarea className={`${inputCls} min-h-[70px]`} placeholder="Notes internes…" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} onBlur={() => { if (f.notes !== (L.notes || '')) save() }} />
          <div className="flex gap-1.5 mt-2">
            <input className={inputCls} placeholder="Ajouter un événement (appel, échange…)" value={note.text} onChange={(e) => setNote({ ...note, text: e.target.value })} />
            <select className={`${inputCls} !w-auto`} value={note.kind} onChange={(e) => setNote({ ...note, kind: e.target.value })}><option value="note">Note</option><option value="appel">Appel</option><option value="email">Email</option><option value="rdv">RDV</option></select>
            <Btn small onClick={() => note.text.trim() && run('note', async () => { apply(await api(`/lead/${siren}/note`, { kind: note.kind, text: note.text.trim() })); setNote({ ...note, text: '' }) })}>Ajouter</Btn>
          </div>
          <div className="mt-2">
            {(L.activities || []).length ? L.activities.map((a: any) => (
              <div key={a.id} className="text-[13px] border-l-2 border-gray-200 pl-2.5 my-1.5">
                <span className="text-xs text-gray-500">{String(a.ts).replace('T', ' ').slice(0, 16)} · {a.kind}</span><br />{a.text}
              </div>
            )) : <div className="text-sm text-gray-500">Aucun événement.</div>}
          </div>
        </Box>
      </div>
      {toast ? <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg z-[60]">{toast}</div> : null}
    </Shell>
  )
}

function Shell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-screen w-full max-w-[640px] bg-gray-50 shadow-2xl z-50 overflow-auto">{children}</div>
    </>
  )
}
