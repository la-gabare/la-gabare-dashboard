'use client'

import { useEffect, useState } from 'react'
import { fetchAdminData } from '@/lib/admin-data'
import { Client, SiteGenere } from '@/lib/types'

const packs = ['essentiel', 'pro', 'premium']
const layoutOptions = [
  {
    value: 'classique',
    label: 'Classique & élégant',
    desc: 'Sections centrées, espacements généreux, ambiance patrimoniale et intemporelle.',
  },
  {
    value: 'moderne',
    label: 'Moderne & épuré',
    desc: 'Beaucoup de blanc, mise en page minimaliste, typographie fine et aérée.',
  },
  {
    value: 'chaleureux',
    label: 'Chaleureux & artisanal',
    desc: 'Ambiance terroir, sections resserrées, bordures et touches décoratives.',
  },
  {
    value: 'affirme',
    label: 'Affirmé & contemporain',
    desc: 'Contrastes marqués, blocs pleine largeur, forte mise en avant visuelle.',
  },
]

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
  a_valider: 'À valider',
  erreur: 'Erreur',
}
const statusBadge: Record<string, string> = {
  en_attente: 'badge-warning',
  en_cours: 'badge-warning',
  a_valider: 'badge-success',
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
    media_urls: [] as string[],
  })

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

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files.length) return

    setUploading(true)
    const uploaded: string[] = []
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'site-creator')
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (res.ok) {
          uploaded.push(data.url)
        } else {
          alert(`Erreur upload ${file.name}: ${data.error || 'inconnue'}`)
        }
      }
      setForm((f) => ({ ...f, media_urls: [...f.media_urls, ...uploaded] }))
    } catch (err) {
      alert('Erreur upload: ' + (err instanceof Error ? err.message : 'inconnue'))
    }
    setUploading(false)
    e.target.value = ''
  }

  const removeMediaUrl = (url: string) => {
    setForm((f) => ({ ...f, media_urls: f.media_urls.filter((u) => u !== url) }))
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
          <label className="block text-sm font-semibold">Mise en page (optionnel)</label>
          <div className="grid grid-cols-2 gap-3">
            {layoutOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setForm({ ...form, style_mise_en_page: form.style_mise_en_page === opt.value ? '' : opt.value })
                }
                className={`text-left px-3 py-2 border rounded-lg transition space-y-2 ${
                  form.style_mise_en_page === opt.value
                    ? 'border-wine bg-wine/5 ring-1 ring-wine'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <LayoutPreview variant={opt.value} />
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-gray-500">{opt.desc}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Laisse sans sélection pour que l&apos;IA choisisse la mise en page la plus adaptée au client.
          </p>
        </div>

        <textarea
          placeholder="Demande personnalisée (style, ton, remarques particulières...)"
          value={form.demande}
          onChange={(e) => setForm({ ...form, demande: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border rounded-lg"
        />

        <div className="space-y-2">
          <label className="block text-sm font-semibold">Photos / vidéos du domaine</label>
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaUpload}
              disabled={uploading}
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            {uploading && <span className="px-3 py-2 text-sm text-gray-600">Envoi...</span>}
          </div>
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
                    onClick={() => removeMediaUrl(url)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={generate} disabled={generating} className="btn-primary">
          {generating ? 'Envoi...' : '✨ Générer'}
        </button>
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
                        <button
                          onClick={() => setPreviewSite(s)}
                          className="px-3 py-1 bg-wine text-white rounded text-sm hover:opacity-90"
                        >
                          👁 Aperçu
                        </button>
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
