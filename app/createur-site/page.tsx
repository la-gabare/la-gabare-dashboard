'use client'

import { useEffect, useState } from 'react'
import { fetchAdminData } from '@/lib/admin-data'
import { Client, SiteGenere } from '@/lib/types'

const packs = ['essentiel', 'pro', 'premium']
const colorPalettes = [
  { name: 'Or vieilli (par défaut)', principale: '#4A3728', secondaire: '#F8F4EF', accent: '#C8A96E' },
  { name: 'Bordeaux profond', principale: '#3B0A14', secondaire: '#F5EDE7', accent: '#9C2B3A' },
  { name: 'Vert bouteille', principale: '#1F3B2C', secondaire: '#F4F1E8', accent: '#7A8B69' },
  { name: 'Ardoise & cuivre', principale: '#2E3238', secondaire: '#EFEAE3', accent: '#B87333' },
  { name: 'Rosé poudré', principale: '#4A3540', secondaire: '#FBF3F0', accent: '#D98A9B' },
  { name: 'Terre de Sienne', principale: '#5C3A21', secondaire: '#F6EEE1', accent: '#D97D3D' },
  { name: 'Nuit étoilée', principale: '#10131A', secondaire: '#EDEFF3', accent: '#C9A66B' },
  { name: 'Lavande de Provence', principale: '#3A3552', secondaire: '#F5F1F8', accent: '#8E7CC3' },
  { name: 'Blanc minéral', principale: '#2B2B28', secondaire: '#FFFFFF', accent: '#A8A296' },
  { name: 'Champagne doré', principale: '#3E3226', secondaire: '#FAF6EC', accent: '#E0B84B' },
]
const fontPairings = [
  { name: 'Or vieilli (par défaut)', identity: 'Playfair Display', body: 'DM Sans' },
  { name: 'Cormorant & Lato', identity: 'Cormorant Garamond', body: 'Lato' },
  { name: 'Marcellus & Work Sans', identity: 'Marcellus', body: 'Work Sans' },
  { name: 'Fraunces & Inter', identity: 'Fraunces', body: 'Inter' },
  { name: 'Libre Baskerville & Nunito', identity: 'Libre Baskerville', body: 'Nunito Sans' },
  { name: 'Bodoni Moda & Karla', identity: 'Bodoni Moda', body: 'Karla' },
  { name: 'EB Garamond & Mulish', identity: 'EB Garamond', body: 'Mulish' },
  { name: 'Abril Fatface & Poppins', identity: 'Abril Fatface', body: 'Poppins' },
  { name: 'Crimson Pro & Manrope', identity: 'Crimson Pro', body: 'Manrope' },
  { name: 'Cinzel & Jost', identity: 'Cinzel', body: 'Jost' },
]
const GOOGLE_FONTS_PREVIEW_URL =
  'https://fonts.googleapis.com/css2?' +
  [
    'family=Playfair+Display:wght@600;700',
    'family=DM+Sans:wght@400;500',
    'family=Cormorant+Garamond:wght@600;700',
    'family=Lato:wght@400',
    'family=Marcellus',
    'family=Work+Sans:wght@400;500',
    'family=Fraunces:wght@600;700',
    'family=Inter:wght@400;500',
    'family=Libre+Baskerville:wght@400;700',
    'family=Nunito+Sans:wght@400;600',
    'family=Bodoni+Moda:wght@600;700',
    'family=Karla:wght@400;500',
    'family=EB+Garamond:wght@600;700',
    'family=Mulish:wght@400;500',
    'family=Abril+Fatface',
    'family=Poppins:wght@400;500',
    'family=Crimson+Pro:wght@600;700',
    'family=Manrope:wght@400;500',
    'family=Cinzel:wght@600;700',
    'family=Jost:wght@400;500',
  ].join('&') +
  '&display=swap'

const templateOptions = [
  { value: 1, label: 'Classique', desc: 'Accroche, chiffres clés, présentation sur deux colonnes puis grille de cuvées.', preview: 'classique' },
  { value: 2, label: 'Moderne', desc: 'Sections asymétriques alternées, grandes images pleine largeur.', preview: 'affirme' },
  { value: 3, label: 'Épuré', desc: 'Très peu de blocs, texte centré, beaucoup de blanc.', preview: 'moderne' },
  { value: 4, label: 'Riche', desc: 'Cartes d’information et large grille de cuvées, pour les domaines qui ont beaucoup à montrer.', preview: 'chaleureux' },
]

const skinOptions = [
  { value: 1, label: 'Classique grave', desc: 'Boutons à angle droit en petites capitales, cartes à filet fin.' },
  { value: 2, label: 'Contemporain doux', desc: 'Boutons en pilule, cartes arrondies avec ombre portée.' },
  { value: 3, label: 'Éditorial brut', desc: 'Bordures épaisses, capitales, cartes qui s’inversent au survol.' },
  { value: 4, label: 'Minimal souligné', desc: 'Boutons réduits à un mot souligné, cartes sans cadre.' },
]

function SkinPreview({ variant }: { variant: number }) {
  const stroke = '#D8D0C6'
  const dark = '#4A3728'
  const accent = '#C8A96E'
  const light = '#F1ECE4'
  const common = { viewBox: '0 0 96 40', className: 'w-full h-10 rounded border bg-white' }

  if (variant === 2) {
    return (
      <svg {...common}>
        <rect x="6" y="6" width="34" height="11" rx="5.5" fill={dark} />
        <rect x="14" y="10.5" width="18" height="2.5" rx="1.25" fill={light} />
        <rect x="48" y="4" width="42" height="32" rx="6" fill="white" stroke={stroke} />
        <rect x="48" y="4" width="42" height="13" rx="6" fill={light} />
        <rect x="54" y="23" width="22" height="2.5" rx="1.25" fill={dark} />
        <rect x="54" y="29" width="14" height="2.5" rx="1.25" fill={accent} />
      </svg>
    )
  }
  if (variant === 3) {
    return (
      <svg {...common}>
        <rect x="6" y="6" width="34" height="11" fill="none" stroke={dark} strokeWidth="2" />
        <rect x="13" y="10.5" width="20" height="2.5" fill={dark} />
        <rect x="48" y="4" width="42" height="32" fill="none" stroke={dark} strokeWidth="2" />
        <rect x="54" y="22" width="24" height="3" fill={dark} />
        <rect x="54" y="29" width="15" height="2.5" fill={accent} />
      </svg>
    )
  }
  if (variant === 4) {
    return (
      <svg {...common}>
        <rect x="8" y="10" width="26" height="2.5" fill={dark} />
        <rect x="8" y="15" width="26" height="1" fill={dark} />
        <rect x="48" y="8" width="42" height="1" fill={stroke} />
        <rect x="52" y="16" width="24" height="3" fill={dark} />
        <rect x="52" y="24" width="14" height="2.5" fill={accent} />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <rect x="6" y="6" width="34" height="11" fill={dark} />
      <rect x="13" y="10.5" width="20" height="2.5" fill={light} />
      <rect x="48" y="4" width="42" height="32" fill="white" stroke={stroke} />
      <rect x="54" y="22" width="24" height="3" fill={dark} />
      <rect x="54" y="29" width="15" height="2.5" fill={accent} />
    </svg>
  )
}

function LayoutPreview({ variant }: { variant: string }) {
  const stroke = '#D8D0C6'
  const dark = '#4A3728'
  const accent = '#C8A96E'
  const light = '#F1ECE4'

  if (variant === 'moderne') {
    return (
      <svg viewBox="0 0 96 56" className="w-full h-14 rounded border bg-white">
        <rect x="0" y="0" width="96" height="10" fill="white" stroke={stroke} strokeWidth="1" />
        <rect x="34" y="3.5" width="12" height="3" fill={dark} />
        <rect x="30" y="20" width="36" height="3" fill={dark} />
        <rect x="24" y="27" width="48" height="1.5" fill={stroke} />
        <rect x="30" y="34" width="14" height="8" fill={light} />
        <rect x="52" y="34" width="14" height="8" fill={light} />
      </svg>
    )
  }
  if (variant === 'chaleureux') {
    return (
      <svg viewBox="0 0 96 56" className="w-full h-14 rounded border bg-white">
        <rect x="0" y="0" width="96" height="9" fill={light} stroke={stroke} strokeWidth="1" />
        <rect x="4" y="13" width="40" height="16" fill="none" stroke={stroke} strokeWidth="1" strokeDasharray="2 1.5" />
        <rect x="48" y="13" width="44" height="16" fill="none" stroke={stroke} strokeWidth="1" strokeDasharray="2 1.5" />
        <rect x="8" y="17" width="14" height="3" fill={dark} />
        <rect x="52" y="17" width="14" height="3" fill={dark} />
        <rect x="4" y="33" width="40" height="16" fill="none" stroke={stroke} strokeWidth="1" strokeDasharray="2 1.5" />
        <rect x="48" y="33" width="44" height="16" fill="none" stroke={stroke} strokeWidth="1" strokeDasharray="2 1.5" />
        <rect x="8" y="37" width="10" height="3" fill={accent} />
        <rect x="52" y="37" width="10" height="3" fill={accent} />
      </svg>
    )
  }
  if (variant === 'affirme') {
    return (
      <svg viewBox="0 0 96 56" className="w-full h-14 rounded border bg-white">
        <rect x="0" y="0" width="96" height="16" fill={dark} />
        <rect x="6" y="6" width="24" height="4" fill={accent} />
        <rect x="0" y="20" width="46" height="18" fill={accent} opacity="0.85" />
        <rect x="50" y="20" width="46" height="18" fill={light} />
        <rect x="0" y="42" width="96" height="14" fill={dark} opacity="0.9" />
      </svg>
    )
  }
  // classique (default)
  return (
    <svg viewBox="0 0 96 56" className="w-full h-14 rounded border bg-white">
      <rect x="0" y="0" width="96" height="9" fill="white" stroke={stroke} strokeWidth="1" />
      <rect x="40" y="3" width="16" height="3" fill={dark} />
      <rect x="24" y="20" width="48" height="4" fill={dark} />
      <rect x="42" y="27" width="12" height="1.5" fill={accent} />
      <rect x="18" y="34" width="60" height="3" fill={stroke} />
      <rect x="24" y="41" width="48" height="3" fill={stroke} />
    </svg>
  )
}

const statusLabels: Record<string, string> = {
  en_attente: 'En attente',
  en_cours: 'Génération en cours',
  a_valider: 'Aperçu à valider',
  validee: 'Validé — site complet en file',
  completion: 'Construction du site complet',
  pret: 'Site complet prêt',
  erreur: 'Erreur',
}
const statusBadge: Record<string, string> = {
  en_attente: 'badge-warning',
  en_cours: 'badge-warning',
  a_valider: 'badge-success',
  validee: 'badge-warning',
  completion: 'badge-warning',
  pret: 'badge-success',
  erreur: 'badge-danger',
}

export default function CreateurSitePage() {
  const [clients, setClients] = useState<Client[]>([])
  const [sites, setSites] = useState<SiteGenere[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [previewSite, setPreviewSite] = useState<SiteGenere | null>(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    client_id: '',
    pack: 'essentiel',
    slogan: '',
    message_principal: '',
    elements_avant: '',
    demande: '',
    couleur_principale: '',
    couleur_secondaire: '',
    couleur_accent: '',
    couleurs_notes: '',
    style_mise_en_page: '',
    style_polices: '',
    template_choisi: null as number | null,
    skin_choisi: null as number | null,
    logo_url: '',
    hero_url: '',
    da_urls: [] as string[],
    media_urls: [] as string[],
  })

  const randomizeAll = () => {
    const pickFrom = <T,>(list: T[], current: T) => {
      const others = list.filter((x) => x !== current)
      const pool = others.length ? others : list
      return pool[Math.floor(Math.random() * pool.length)]
    }
    const palette = pickFrom(
      colorPalettes,
      colorPalettes.find((p) => p.principale === form.couleur_principale) || colorPalettes[0]
    )
    const fonts = pickFrom(fontPairings, fontPairings.find((f) => f.name === form.style_polices) || fontPairings[0])
    setForm((f) => ({
      ...f,
      template_choisi: pickFrom(templateOptions.map((t) => t.value), f.template_choisi as number),
      skin_choisi: pickFrom(skinOptions.map((s) => s.value), f.skin_choisi as number),
      couleur_principale: palette.principale,
      couleur_secondaire: palette.secondaire,
      couleur_accent: palette.accent,
      style_polices: fonts.name,
    }))
  }

  const fetchData = async () => {
    setLoading(true)
    const [clientsRes, sitesRes] = await Promise.all([
      fetchAdminData<Client>('clients', { order_column: 'nom_domaine' }),
      fetchAdminData<SiteGenere>('sites_generes', { order_column: 'created_at', order_asc: 'false' }),
    ])
    setClients(clientsRes)
    setSites(sitesRes)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (document.querySelector('link[data-font-preview]')) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = GOOGLE_FONTS_PREVIEW_URL
    link.setAttribute('data-font-preview', 'true')
    document.head.appendChild(link)
  }, [])

  const clientName = (id: number) => clients.find((c) => c.id === id)?.nom_domaine || `#${id}`

  const handleClientChange = (clientId: string) => {
    if (!clientId) {
      setForm((f) => ({
        ...f,
        client_id: '',
        slogan: '',
        message_principal: '',
        elements_avant: '',
        demande: '',
        couleur_principale: '',
        couleur_secondaire: '',
        couleur_accent: '',
        couleurs_notes: '',
        style_mise_en_page: '',
        style_polices: '',
      }))
      return
    }

    const client = clients.find((c) => c.id === parseInt(clientId))
    const profil = (client?.profil_client_complet || {}) as Record<string, any>

    const elements = [profil.cuvees_principales, client?.points_forts].filter(Boolean).join(' — ')

    setForm((f) => ({
      ...f,
      client_id: clientId,
      slogan: profil.slogan || '',
      message_principal: profil.messages_cles || profil.positionnement || '',
      elements_avant: elements,
      demande: profil.remarques || '',
      couleur_principale: '',
      couleur_secondaire: '',
      couleur_accent: '',
      couleurs_notes: profil.couleurs_souhaitees || '',
    }))
  }

  const sendFiles = async (files: File[], type: string) => {
    const uploaded: string[] = []
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) uploaded.push(data.url)
      else alert(`Erreur upload ${file.name}: ${data.error || 'inconnue'}`)
    }
    return uploaded
  }

  const handleSingleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logo_url' | 'hero_url'
  ) => {
    const files = e.target.files
    if (!files || !files.length) return
    setUploading(true)
    try {
      const [url] = await sendFiles([files[0]], `site-${field.replace('_url', '')}`)
      if (url) setForm((f) => ({ ...f, [field]: url }))
    } catch (err) {
      alert('Erreur upload: ' + (err instanceof Error ? err.message : 'inconnue'))
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleMultiUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'da_urls' | 'media_urls'
  ) => {
    const files = e.target.files
    if (!files || !files.length) return
    setUploading(true)
    try {
      const urls = await sendFiles(Array.from(files), field === 'da_urls' ? 'site-da' : 'site-creator')
      setForm((f) => ({ ...f, [field]: [...f[field], ...urls] }))
    } catch (err) {
      alert('Erreur upload: ' + (err instanceof Error ? err.message : 'inconnue'))
    }
    setUploading(false)
    e.target.value = ''
  }

  const removeMediaUrl = (url: string, field: 'da_urls' | 'media_urls' = 'media_urls') => {
    setForm((f) => ({ ...f, [field]: f[field].filter((u) => u !== url) }))
  }

  const generate = async () => {
    if (!form.client_id) {
      alert('Sélectionne un client')
      return
    }
    setGenerating(true)
    try {
      const swatches = [
        form.couleur_principale && `principale ${form.couleur_principale}`,
        form.couleur_secondaire && `secondaire ${form.couleur_secondaire}`,
        form.couleur_accent && `accent ${form.couleur_accent}`,
      ].filter(Boolean)
      const couleurs_souhaitees = [swatches.length ? `Palette : ${swatches.join(', ')}` : '', form.couleurs_notes]
        .filter(Boolean)
        .join(' — ') || null

      const chosenFonts = fontPairings.find((f) => f.name === form.style_polices)
      const polices_souhaitees = chosenFonts
        ? `Titres : ${chosenFonts.identity}, Texte : ${chosenFonts.body}`
        : null

      const res = await fetch('/api/sites-generes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: parseInt(form.client_id),
          pack: form.pack,
          slogan: form.slogan || null,
          message_principal: form.message_principal || null,
          elements_avant: form.elements_avant || null,
          demande: form.demande || null,
          couleurs_souhaitees,
          style_mise_en_page: form.style_mise_en_page || null,
          polices_souhaitees,
          template_choisi: form.template_choisi,
          skin_choisi: form.skin_choisi,
          logo_url: form.logo_url || null,
          hero_url: form.hero_url || null,
          da_urls: form.da_urls,
          media_urls: form.media_urls,
        }),
      })
      if (res.ok) {
        setForm({
          client_id: '',
          pack: 'essentiel',
          slogan: '',
          message_principal: '',
          elements_avant: '',
          demande: '',
          couleur_principale: '',
          couleur_secondaire: '',
          couleur_accent: '',
          couleurs_notes: '',
          style_mise_en_page: '',
          style_polices: '',
          template_choisi: null,
          skin_choisi: null,
          logo_url: '',
          hero_url: '',
          da_urls: [],
          media_urls: [],
        })
        alert('Génération mise en file d\'attente : l\'agent n8n va la traiter sous peu.')
        fetchData()
      } else {
        const err = await res.json()
        alert('Erreur: ' + err.error)
      }
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'inconnue'))
    }
    setGenerating(false)
  }

  const validerSite = async (s: SiteGenere) => {
    if (
      !confirm(
        "Valider cet aperçu ?\n\nLe site complet sera construit à partir du modèle du pack (pages, dashboard, connexion). Cela relance une génération."
      )
    )
      return
    const res = await fetch('/api/sites-generes/valider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id }),
    })
    const data = await res.json()
    if (!res.ok) {
      alert('Erreur: ' + (data.error || 'inconnue'))
      return
    }
    alert(
      `Site validé.\n\nIdentifiants du dashboard à transmettre au client :\n\n` +
        `Adresse : ${data.admin_file}\nMot de passe : ${data.admin_password}\n\n` +
        `Ces identifiants restent consultables ici, ils ne changeront plus.`
    )
    fetchData()
  }

  const deleteSite = async (id: number) => {
    if (!confirm('Supprimer cette génération ?')) return
    await fetch('/api/sites-generes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetchData()
  }

  return (
    <div className="container-dashboard">
      <h1 className="text-3xl font-bold mb-8">Créateur de site</h1>

      <div className="card mb-8 space-y-3">
        <h2 className="text-xl font-bold mb-2">Générer un site</h2>

        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.client_id}
            onChange={(e) => handleClientChange(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">Sélectionner un client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.nom_domaine}</option>
            ))}
          </select>
          <select
            value={form.pack}
            onChange={(e) => setForm({ ...form, pack: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            {packs.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <input
          type="text"
          placeholder="Slogan souhaité (optionnel)"
          value={form.slogan}
          onChange={(e) => setForm({ ...form, slogan: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg"
        />
        <textarea
          placeholder="Message principal à transmettre"
          value={form.message_principal}
          onChange={(e) => setForm({ ...form, message_principal: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border rounded-lg"
        />
        <textarea
          placeholder="Éléments à mettre en avant (cuvées, savoir-faire, terroir, distinctions...)"
          value={form.elements_avant}
          onChange={(e) => setForm({ ...form, elements_avant: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border rounded-lg"
        />
        <div className="space-y-2 border rounded-lg p-3">
          <label className="block text-sm font-semibold">Palette de couleurs (optionnel)</label>

          <div className="space-y-1.5">
            <div className="text-xs font-medium text-gray-600">Palettes suggérées (clique pour appliquer)</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {colorPalettes.map((p) => {
                const active =
                  form.couleur_principale === p.principale &&
                  form.couleur_secondaire === p.secondaire &&
                  form.couleur_accent === p.accent
                return (
                  <button
                    key={p.name}
                    type="button"
                    title={p.name}
                    onClick={() =>
                      setForm({
                        ...form,
                        couleur_principale: p.principale,
                        couleur_secondaire: p.secondaire,
                        couleur_accent: p.accent,
                      })
                    }
                    className={`flex flex-col items-center gap-1 px-2 py-2 border rounded-lg text-center transition ${
                      active ? 'border-wine ring-1 ring-wine' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="flex gap-0.5">
                      <span className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ background: p.principale }} />
                      <span className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ background: p.secondaire }} />
                      <span className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ background: p.accent }} />
                    </span>
                    <span className="text-xs leading-tight">{p.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.couleur_principale || '#4A3728'}
                onChange={(e) => setForm({ ...form, couleur_principale: e.target.value })}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <div className="text-sm">
                <div className="font-medium">Principale</div>
                <div className="text-gray-500">{form.couleur_principale || 'auto'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.couleur_secondaire || '#F8F4EF'}
                onChange={(e) => setForm({ ...form, couleur_secondaire: e.target.value })}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <div className="text-sm">
                <div className="font-medium">Secondaire</div>
                <div className="text-gray-500">{form.couleur_secondaire || 'auto'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.couleur_accent || '#C8A96E'}
                onChange={(e) => setForm({ ...form, couleur_accent: e.target.value })}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <div className="text-sm">
                <div className="font-medium">Accent</div>
                <div className="text-gray-500">{form.couleur_accent || 'auto'}</div>
              </div>
            </div>
          </div>
          <input
            type="text"
            placeholder="Notes sur les couleurs / l'ambiance souhaitée (ex : tons chauds, terre et or, sobre...)"
            value={form.couleurs_notes}
            onChange={(e) => setForm({ ...form, couleurs_notes: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <p className="text-xs text-gray-500">
            Laisse les couleurs sur &quot;auto&quot; pour que l&apos;IA propose une palette adaptée au client. Choisis une couleur pour l&apos;imposer.
          </p>
        </div>

        <div className="space-y-2 border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold">Structure de la page (optionnel)</label>
            <button
              type="button"
              onClick={() => {
                setForm((f) => {
                  const others = templateOptions.filter((o) => o.value !== f.template_choisi)
                  return { ...f, template_choisi: others[Math.floor(Math.random() * others.length)].value }
                })
              }}
              className="text-xs px-2 py-1 border rounded-lg hover:bg-gray-50"
            >
              🎲 Aléatoire
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {templateOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, template_choisi: f.template_choisi === opt.value ? null : opt.value }))
                }
                className={`text-left px-3 py-2 border rounded-lg transition space-y-2 ${
                  form.template_choisi === opt.value
                    ? 'border-wine bg-wine/5 ring-1 ring-wine'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <LayoutPreview variant={opt.preview} />
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-gray-500">{opt.desc}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Laisse sans sélection pour que l&apos;IA choisisse la structure la plus adaptée au client.
          </p>
        </div>

        <div className="space-y-2 border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold">Style des éléments (optionnel)</label>
            <button
              type="button"
              onClick={() => {
                setForm((f) => {
                  const others = skinOptions.filter((o) => o.value !== f.skin_choisi)
                  return { ...f, skin_choisi: others[Math.floor(Math.random() * others.length)].value }
                })
              }}
              className="text-xs px-2 py-1 border rounded-lg hover:bg-gray-50"
            >
              🎲 Aléatoire
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {skinOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, skin_choisi: f.skin_choisi === opt.value ? null : opt.value }))}
                className={`text-left px-3 py-2 border rounded-lg transition space-y-2 ${
                  form.skin_choisi === opt.value
                    ? 'border-wine bg-wine/5 ring-1 ring-wine'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <SkinPreview variant={opt.value} />
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-gray-500">{opt.desc}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Détermine la forme des boutons, des cartes et des titres. Indépendant de la structure : les deux se combinent.
          </p>
        </div>

        <div className="space-y-2 border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold">Polices (optionnel)</label>
            <button
              type="button"
              onClick={() => {
                const others = fontPairings.filter((f) => f.name !== form.style_polices)
                const pick = (others.length ? others : fontPairings)[Math.floor(Math.random() * (others.length ? others.length : fontPairings.length))]
                setForm({ ...form, style_polices: pick.name })
              }}
              className="text-xs px-2 py-1 border rounded-lg hover:bg-gray-50"
            >
              🎲 Aléatoire
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {fontPairings.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => setForm({ ...form, style_polices: form.style_polices === f.name ? '' : f.name })}
                className={`text-left px-3 py-2 border rounded-lg transition ${
                  form.style_polices === f.name
                    ? 'border-wine bg-wine/5 ring-1 ring-wine'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-lg leading-tight truncate" style={{ fontFamily: `'${f.identity}', serif` }}>
                  Domaine Exemple
                </div>
                <div className="text-xs text-gray-600 truncate" style={{ fontFamily: `'${f.body}', sans-serif` }}>
                  Vinificateurs depuis 1962
                </div>
                <div className="text-xs text-gray-400 mt-1">{f.name}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Laisse sans sélection pour que l&apos;IA choisisse les polices les plus adaptées au client.
          </p>
        </div>

        <textarea
          placeholder="Demande personnalisée (style, ton, remarques particulières...)"
          value={form.demande}
          onChange={(e) => setForm({ ...form, demande: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border rounded-lg"
        />

        <div className="space-y-4 border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold">Visuels</label>
            {uploading && <span className="text-sm text-gray-600">Envoi...</span>}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium">Logo du domaine</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleSingleUpload(e, 'logo_url')}
                disabled={uploading}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              {form.logo_url && (
                <div className="relative inline-block">
                  <img src={form.logo_url} alt="" className="h-16 object-contain rounded border bg-white p-1" />
                  <button
                    onClick={() => setForm((f) => ({ ...f, logo_url: '' }))}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-none"
                  >
                    ×
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500">En-tête, pied de page et portail d&apos;âge. PNG transparent ou SVG de préférence.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium">Photo principale (hero)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleSingleUpload(e, 'hero_url')}
                disabled={uploading}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              {form.hero_url && (
                <div className="relative inline-block">
                  <img src={form.hero_url} alt="" className="h-16 w-28 object-cover rounded border" />
                  <button
                    onClick={() => setForm((f) => ({ ...f, hero_url: '' }))}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-none"
                  >
                    ×
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500">Grande image d&apos;accueil. Privilégie une photo large et lumineuse.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium">Éléments de direction artistique</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleMultiUpload(e, 'da_urls')}
              disabled={uploading}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            {form.da_urls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.da_urls.map((url) => (
                  <div key={url} className="relative">
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded border" />
                    <button
                      onClick={() => removeMediaUrl(url, 'da_urls')}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500">
              Étiquettes, motifs, textures, extraits de charte. Servent de référence à l&apos;IA pour la palette et l&apos;ambiance.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium">Photos / vidéos du domaine</label>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => handleMultiUpload(e, 'media_urls')}
              disabled={uploading}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            {form.media_urls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.media_urls.map((url) => (
                  <div key={url} className="relative">
                    {/\.(mp4|mov|webm)$/i.test(url) ? (
                      <video src={url} className="w-16 h-16 object-cover rounded border" muted />
                    ) : (
                      <img src={url} alt="" className="w-16 h-16 object-cover rounded border" />
                    )}
                    <button
                      onClick={() => removeMediaUrl(url, 'media_urls')}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500">Vignes, chai, caveau, cuvées. Illustrent les sections de présentation.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={generate} disabled={generating} className="btn-primary">
            {generating ? 'Envoi...' : '✨ Générer'}
          </button>
          <button
            type="button"
            onClick={randomizeAll}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm"
            title="Tire au sort la structure, le style des éléments, la palette et les polices"
          >
            🎲 Tout aléatoire
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Générations</h2>
        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : sites.length === 0 ? (
          <p className="text-gray-500">Aucune génération pour le moment</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Pack</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{clientName(s.client_id)}</td>
                    <td className="px-4 py-3">
                      <span className="badge badge-info">{s.pack}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">{new Date(s.created_at).toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusBadge[s.status || ''] || 'badge-info'}`}>
                        {statusLabels[s.status || ''] || s.status}
                      </span>
                      {s.error_message && (
                        <p className="text-xs text-red-500 mt-1 max-w-xs truncate" title={s.error_message}>{s.error_message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                      {s.html_genere && (
                        <>
                          <button
                            onClick={() => setPreviewSite(s)}
                            className="px-3 py-1 bg-wine text-white rounded text-sm hover:opacity-90"
                          >
                            👁 Aperçu
                          </button>
                          {s.status === 'a_valider' && (
                            <button
                              onClick={() => validerSite(s)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                              title="Construire le site complet à partir du modèle du pack"
                            >
                              ✅ Valider
                            </button>
                          )}
                          <a
                            href={`/api/sites-generes/download?id=${s.id}`}
                            className="inline-block px-3 py-1 bg-gray-700 text-white rounded text-sm hover:bg-gray-800"
                            title={
                              s.status === 'pret'
                                ? 'Site complet : toutes les pages, le dashboard et la connexion'
                                : 'Aperçu seul : la page d accueil. Valide pour obtenir le site complet.'
                            }
                          >
                            ⬇ {s.status === 'pret' ? 'Site complet' : 'Aperçu'}
                          </a>
                        </>
                      )}
                      <button
                        onClick={() => deleteSite(s.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewSite && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewSite(null)}
        >
          <div className="bg-white rounded-lg w-full max-w-5xl h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold">Aperçu — {clientName(previewSite.client_id)} ({previewSite.pack})</h3>
              <button onClick={() => setPreviewSite(null)} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Fermer</button>
            </div>
            <iframe
              srcDoc={previewSite.html_genere}
              className="flex-1 w-full"
              title="Aperçu du site généré"
            />
          </div>
        </div>
      )}
    </div>
  )
}
