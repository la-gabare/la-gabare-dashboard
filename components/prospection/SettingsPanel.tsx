'use client'

import { useState } from 'react'
import { Btn, api, eurFull, inputCls } from './ui'

export default function SettingsPanel({ cfg, onSaved }: { cfg: any; onSaved: (s: any) => void }) {
  const [s, setS] = useState<Record<string, string>>(cfg.settings)
  const [saved, setSaved] = useState(false)
  const fld = (k: string, label: string, ph = '') => (
    <label className="text-xs text-gray-500">{label}
      <input className={`${inputCls} mt-0.5`} value={s[k] || ''} placeholder={ph} type={k === 'serper_key' ? 'password' : 'text'} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
    </label>
  )
  return (
    <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(380px,1fr))]">
      <div className="card">
        <h3 className="font-semibold mb-3">Expéditeur des messages</h3>
        <div className="grid grid-cols-2 gap-3">
          {fld('sender_name', 'Votre prénom', 'ex. Louis')}{fld('company', 'Entreprise')}{fld('sender_email', 'Email')}{fld('phone', 'Téléphone')}{fld('site', 'Site')}{fld('calendar', 'Lien de prise de RDV (optionnel)', 'https://cal.com/…')}
        </div>
        <h3 className="font-semibold mt-5 mb-1">Google Places (optionnel)</h3>
        <p className="text-sm text-gray-500 mb-3">Avec une clé <a className="text-wine underline" href="https://serper.dev" target="_blank" rel="noopener noreferrer">Serper.dev</a> (2 500 requêtes gratuites), la détection interroge Google : site de la fiche, note et nombre d&apos;avis, téléphone. C&apos;est la source la plus fiable pour confirmer l&apos;absence de site.</p>
        <div className="grid grid-cols-2 gap-3">{fld('serper_key', 'Clé API Serper')}</div>
        <div className="mt-4 flex items-center gap-3">
          <Btn primary onClick={async () => { const r = await api('/settings', s); onSaved(r); setSaved(true); setTimeout(() => setSaved(false), 2000) }}>Enregistrer</Btn>
          {saved ? <span className="text-sm text-green-700">Réglages enregistrés</span> : null}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3">Vos offres (reprises de la-gabare.fr)</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-gray-500"><th className="py-1">Création</th><th>Prix HT</th></tr></thead>
          <tbody>{Object.entries(cfg.offers.packs).map(([k, v]: any) => <tr key={k} className="border-t border-gray-100"><td className="py-1.5"><b>{k}</b><div className="text-xs text-gray-500">{v.desc}</div></td><td>{eurFull(v.price)}</td></tr>)}</tbody>
          <thead><tr className="text-left text-xs uppercase text-gray-500"><th className="pt-3 py-1">Abonnement</th><th className="pt-3">Par mois</th></tr></thead>
          <tbody>{Object.entries(cfg.offers.abos).map(([k, v]: any) => <tr key={k} className="border-t border-gray-100"><td className="py-1.5"><b>{k}</b><div className="text-xs text-gray-500">{v.desc}</div></td><td>{eurFull(v.price)}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="card lg:col-span-2" style={{ gridColumn: '1 / -1' }}>
        <h3 className="font-semibold mb-3">Méthode de scoring (100 points)</h3>
        <div className="grid gap-4 text-sm grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
          <div><b>Besoin de site — 35 pts</b><p className="text-gray-500">Sans site confirmé 35 · non confirmé 26 · site HS 35 · obsolète 30 · vieillissant 18 · non vérifié 15 · moderne 5. Obsolescence (0-100) : HTTPS, mobile, code ancien, copyright daté, constructeur d&apos;entrée de gamme, SEO de base, lenteur.</p></div>
          <div><b>Besoin de communication — 20 pts</b><p className="text-gray-500">Aucun réseau social, pas d&apos;Instagram, pas de blog, message sanitaire Évin absent, pas de boutique malgré la taille, œnotourisme sans réservation en ligne.</p></div>
          <div><b>Capacité à investir — 25 pts</b><p className="text-gray-500">Effectif (0 → 25 pts) ou chiffre d&apos;affaires publié, le plus favorable des deux. Un domaine sans salarié plafonne à 3 pts.</p></div>
          <div><b>Timing &amp; expansion — 20 pts</b><p className="text-gray-500">Création ≤ 6 ans, plusieurs établissements, transmission (dirigeant 55+ avec successeur ou 60+), CA +10 %, bio, vinification, fiche Google active.</p></div>
          <div><b>Pondération qualité</b><p className="text-gray-500">× 0,1 coopératives · × 0,35 grandes structures (≥ 50 salariés ou ≥ 20 M€ de CA : ont déjà une équipe marketing) · × 0,6 vignerons sans salarié ni vinification (souvent coopérateurs).</p></div>
          <div><b>Priorités &amp; offres</b><p className="text-gray-500">A ≥ 62 · B ≥ 42 · C en dessous. Pack : Premium si ≥ 10 sal., ≥ 3 sites ou CA ≥ 1,5 M€ ; Pro si ≥ 3 sal. ou CA ≥ 400 k€ ; sinon Essentiel. Abonnement : Grand Cru / Réserve / Village selon taille et expansion.</p></div>
        </div>
        <div className="mt-4 text-sm bg-amber-50 text-amber-900 rounded-lg px-3 py-2"><b>Prospection B2B &amp; RGPD.</b> La prospection par email vers des professionnels est autorisée si le message est en rapport avec leur activité et propose un moyen simple de s&apos;opposer (inclus dans les modèles). Pour les entrepreneurs individuels, restez sur un email professionnel et respectez les oppositions. Les données importées sont des données publiques d&apos;entreprises (SIRENE) ; les entreprises « non diffusibles » sont exclues.</div>
      </div>
    </div>
  )
}
