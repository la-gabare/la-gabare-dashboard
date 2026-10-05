'use client'

import { useEffect, useState } from 'react'
import { Bars, Btn, EFFS, Kpi, SITE, SectionTitle, api, eur, num, pct } from './ui'
import LeadTable from './LeadTable'

export default function Dashboard({ cfg, onOpen, onPreset, goImport, onStats }: {
  cfg: any; onOpen: (s: string) => void; onPreset: (k: string) => void; goImport: () => void; onStats: (s: any) => void
}) {
  const [s, setS] = useState<any>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/stats').then((d) => { if (d.error) setErr(d.error); else { setS(d); onStats(d) } }).catch((e) => setErr(e.message))
  }, [])

  if (err) return <div className="card text-red-700">Impossible de charger les statistiques : {err}<div className="text-sm text-gray-600 mt-2">Les tables du module sont-elles créées ? Exécutez <code>sql/create_prospection.sql</code> dans Supabase.</div></div>
  if (!s) return <div className="text-gray-500">Chargement…</div>
  if (!s.total) {
    return (
      <div className="card max-w-xl">
        <h2 className="text-lg font-semibold mb-2">Bienvenue</h2>
        <p className="text-gray-600 mb-3">Votre base de prospects est vide.</p>
        <p className="text-sm mb-4">1. <b>Importer</b> les domaines viticoles de votre zone depuis le registre officiel SIRENE (gratuit).<br />2. <b>Détecter</b> leur site web.<br />3. <b>Auditer</b> les sites : obsolescence, mobile, boutique, loi Évin, réseaux sociaux.</p>
        <Btn primary onClick={goImport}>Importer mes premiers prospects</Btn>
      </div>
    )
  }
  const seg = s.seg, f = s.funnel, st = s.by_status, sg = s.signals
  const abTotal = s.by_pack.reduce((a: number, r: any) => a + r.d, 0)
  const mrrAB = s.by_abo.reduce((a: number, r: any) => a + r.m, 0)
  const funnel: [string, number][] = [['Contactés', f.contacted], ['RDV / audit', f.rdv], ['Devis envoyés', f.devis], ['Gagnés', f.won]]
  const mx = Math.max(1, f.contacted)
  const grid = 'grid gap-3 grid-cols-[repeat(auto-fill,minmax(176px,1fr))]'
  return (
    <div>
      <SectionTitle>Marché adressable</SectionTitle>
      <div className={grid}>
        <Kpi label="Prospects en base" value={num(s.total)} hint={`${num(sg.employers)} employeurs`} />
        <Kpi label="Qualifiés (score ≥ 42)" value={num(s.qualified)} hint={`${pct(s.qualified, s.total)} de la base`} tone="wine" />
        <Kpi label="Priorité A" value={num(s.prioA)} hint="à contacter en premier" tone="hot" />
        <Kpi label="Sites détectés" value={num(sg.has_url)} hint={`${pct(sg.has_url, s.total)} · ${num(sg.audited)} audités`} />
        <Kpi label="Valeur potentielle A+B" value={eur(abTotal)} hint="création + 12 mois d'abonnement" />
        <Kpi label="MRR potentiel A+B" value={`${eur(mrrAB)}/mois`} hint="abonnements recommandés" />
      </div>

      <SectionTitle>Opportunités par offre (prospects A + B)</SectionTitle>
      <div className={grid}>
        <Kpi label="Création de site" value={num(seg.sans)} hint="sans site ou site HS" tone="hot" />
        <Kpi label="Refonte" value={num(seg.refonte)} hint="site obsolète / vieillissant" tone="hot" />
        <Kpi label="Abonnement seul" value={num(seg.abo_only)} hint="site correct, besoin de contenu" tone="wine" />
        <Kpi label="À qualifier" value={num(seg.a_auditer)} hint="site non vérifié" />
        <Kpi label="Obsolescence moyenne" value={s.avg_obsolescence == null ? '—' : `${Math.round(s.avg_obsolescence)} / 100`} hint="sur les sites audités" />
        <Kpi label="Relances dues" value={num(s.due)} hint="prochaine action ≤ aujourd'hui" tone={s.due ? 'hot' : ''} />
      </div>

      <SectionTitle>Pipeline commercial</SectionTitle>
      <div className={grid}>
        <Kpi label="Pipeline ouvert" value={eur(s.pipeline_potential)} hint="valeur 1re année des deals en cours" />
        <Kpi label="Pipeline pondéré" value={eur(s.pipeline_weighted)} hint="valeur × proba. par étape" tone="wine" />
        <Kpi label="Gagné (1re année)" value={eur(s.won_value)} hint={`${num(f.won)} client(s)`} tone="ok" />
        <Kpi label="MRR gagné" value={`${eur(s.won_mrr)}/mois`} hint="abonnements signés" tone="ok" />
        <Kpi label="Contact → RDV" value={pct(f.rdv, f.contacted)} hint={`${num(f.rdv)} / ${num(f.contacted)}`} />
        <Kpi label="RDV → Devis → Signé" value={`${pct(f.devis, f.rdv)} → ${pct(f.won, f.devis)}`} />
      </div>

      <div className="grid gap-3 mt-4 grid-cols-[repeat(auto-fit,minmax(340px,1fr))]">
        <div className="card">
          <h3 className="font-semibold mb-3">Entonnoir de conversion</h3>
          {funnel.map(([n, v]) => (
            <div key={n} className="flex items-center gap-3 text-sm my-1.5">
              <div className="w-28 shrink-0">{n}</div>
              <div className="flex-1 h-5 bg-stone-100 rounded-md overflow-hidden"><i className="flex h-full items-center pl-2 text-white text-xs font-semibold bg-wine" style={{ width: `${Math.max(6, (100 * v) / mx)}%` }}>{num(v)}</i></div>
              <div className="w-14 text-right text-xs text-gray-500">{pct(v, f.contacted)}</div>
            </div>
          ))}
          <div className="text-xs text-gray-500 mt-2">Perdus : {num(f.lost)} · À contacter : {num(st['À contacter']?.c)} · Nouveaux : {num(st['Nouveau']?.c)}</div>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-3">État des sites web</h3>
          <Bars rows={['aucun', 'hs', 'obsolete', 'vieillissant', 'moderne', 'inconnu'].map((k) => ({ n: SITE[k][0], v: s.by_site[k] || 0 }))} fmt={(r) => `${num(r.v)} · ${pct(r.v, s.total)}`} />
        </div>
        <div className="card">
          <h3 className="font-semibold mb-3">Par zone d&apos;appellation <span className="text-xs font-normal text-gray-500">(total · dont priorité A)</span></h3>
          <Bars rows={s.by_zone.map((r: any) => ({ n: r.k, v: r.c, v2: r.a }))} fmt={(r) => `${num(r.v)} · ${num(r.v2)}`} />
        </div>
        <div className="card">
          <h3 className="font-semibold mb-3">Par département</h3>
          <Bars rows={s.by_dept.map((r: any) => ({ n: `${cfg.dept_names[r.k] || r.k} (${r.k})`, v: r.c, v2: r.a }))} fmt={(r) => `${num(r.v)} · ${num(r.v2)}`} />
        </div>
        <div className="card">
          <h3 className="font-semibold mb-3">Pack de création recommandé <span className="text-xs font-normal text-gray-500">(A + B)</span></h3>
          <Bars rows={s.by_pack.map((r: any) => ({ n: r.k, v: r.c, d: r.d }))} fmt={(r) => `${num(r.v)} · ${eur(r.d)}`} />
        </div>
        <div className="card">
          <h3 className="font-semibold mb-3">Abonnement recommandé <span className="text-xs font-normal text-gray-500">(A + B)</span></h3>
          <Bars rows={s.by_abo.map((r: any) => ({ n: r.k, v: r.c, m: r.m }))} fmt={(r) => `${num(r.v)} · ${eur(r.m)}/m`} />
        </div>
        <div className="card">
          <h3 className="font-semibold mb-3">Signaux d&apos;expansion &amp; timing</h3>
          <Bars rows={[
            { n: 'Transmission (dirigeant 60+)', v: sg.transmission || 0 }, { n: 'Création récente (≤ 6 ans)', v: sg.recent || 0 },
            { n: 'Plusieurs établissements', v: sg.multi || 0 }, { n: 'CA en hausse (≥ +10 %)', v: sg.growth || 0 },
            { n: 'Certifié bio', v: sg.bio || 0 }, { n: 'Vinifie / vend du vin', v: sg.vinifie || 0 },
          ]} />
        </div>
        <div className="card">
          <h3 className="font-semibold mb-3">Taille &amp; forme juridique</h3>
          <Bars rows={EFFS.map(([c, l]) => ({ n: l, v: (s.by_eff.find((x: any) => x.k === c) || {}).c || 0 }))} />
          <div className="h-2" />
          <Bars rows={s.by_legal.map((r: any) => ({ n: r.k, v: r.c }))} />
        </div>
        <div className="card">
          <h3 className="font-semibold mb-3">Contactabilité</h3>
          <Bars max={s.total} rows={[{ n: 'Email trouvé', v: sg.has_email || 0 }, { n: 'Téléphone trouvé', v: sg.has_phone || 0 }, { n: 'Site détecté', v: sg.has_url || 0 }]} fmt={(r) => `${num(r.v)} · ${pct(r.v, s.total)}`} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 mb-2">
        <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Top 10 — opportunités chaudes à contacter</h2>
        <Btn small primary onClick={() => onPreset('hot')}>Voir les opportunités chaudes</Btn>
      </div>
      {s.hot.length ? <LeadTable compact items={s.hot} effLabels={cfg.eff_labels} onOpen={onOpen} /> : <div className="card text-gray-500">Aucun prospect de priorité A pour le moment. Lancez la détection des sites pour affiner les scores.</div>}
    </div>
  )
}
