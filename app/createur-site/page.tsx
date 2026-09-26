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

type Cuvee = {
  nom: string
  description: string
  photo_url: string
  prix?: string
  alcool?: string
  aromes_primaires?: string[]
  aromes_secondaires?: string[]
  cepages?: string[]
}

const aromePrimaires = [
  'Agrumes', 'Ananas', 'Pomme', 'Poire', 'Pêche', 'Abricot',
  'Framboise', 'Fraise', 'Cerise', 'Cassis', 'Myrtille',
  'Rose', 'Pivoine', 'Acacia', 'Miel', 'Vanille', 'Beurre',
  'Amande', 'Noisette', 'Cacahuète', 'Épices', 'Menthe',
]

const aromeSecondaires = [
  'Caramel', 'Chocolat', 'Café', 'Cacao', 'Moka', 'Tabac',
  'Cuir', 'Truffe', 'Champignon', 'Sous-bois', 'Humus',
  'Pierre à fusil', 'Minéral', 'Iodé', 'Sel', 'Poivre',
  'Cannelle', 'Clou de girofle', 'Anis', 'Réglisse', 'Fumé',
]

const cepagesList = [
  'Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Gewürztraminer', 'Pinot Gris',
  'Albariño', 'Grüner Veltliner', 'Vermentino', 'Muscadet', 'Sancerre',
  'Merlot', 'Cabernet Sauvignon', 'Pinot Noir', 'Syrah', 'Grenache',
  'Tempranillo', 'Nebbiolo', 'Brunello', 'Gamay', 'Cabernet Franc',
  'Tannat', 'Mourvèdre', 'Carignan', 'Chenin Blanc', 'Viognier',
  'Marsanne', 'Roussanne', 'Verdicchio', 'Gavi', 'Cinsault',
]

const templateOptions = [
  { value: 1, label: 'Classique' },
  { value: 2, label: 'Moderne' },
  { value: 3, label: 'Épuré' },
  { value: 4, label: 'Riche' },
]

const skinOptions = [
  { value: 1, label: 'Classique grave' },
  { value: 2, label: 'Contemporain doux' },
  { value: 3, label: 'Éditorial brut' },
  { value: 4, label: 'Minimal souligné' },
]

const statusLabels: Record<string, string> = {
  en_attente: 'En attente',
  en_cours: 'Génération en cours',
  a_valider: 'Aperçu à valider',
  validee: 'Validé — site complet en file',
  completion: 'Construction du site complet',
  pret: 'Site complet prêt',
  erreur: 'Erreur',
}

export default function CreateurSitePage() {
  const [clients, setClients] = useState<Client[]>([])
  const [sites, setSites] = useState<SiteGenere[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [previewSite, setPreviewSite] = useState<SiteGenere | null>(null)
  const [uploading, setUploading] = useState(false)
  const [promptModal, setPromptModal] = useState<{ visible: boolean; prompt: string }>({ visible: false, prompt: '' })
  const [descriptionClient, setDescriptionClient] = useState('')
  const [searchAromes, setSearchAromes] = useState<{ primaires: string; secondaires: string; cepages: string }>({ primaires: '', secondaires: '', cepages: '' })
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
    cuvees: [] as Cuvee[],
  })

  const ajouterCuvee = () =>
    setForm((f) => ({ ...f, cuvees: [...f.cuvees, { nom: '', description: '', photo_url: '', prix: '', alcool: '', aromes_primaires: [], aromes_secondaires: [], cepages: [] }] }))

  const modifierCuvee = (i: number, champ: keyof Cuvee, valeur: string) =>
    setForm((f) => ({
      ...f,
      cuvees: f.cuvees.map((c, idx) => (idx === i ? { ...c, [champ]: valeur } : c)),
    }))

  const supprimerCuvee = (i: number) =>
    setForm((f) => ({ ...f, cuvees: f.cuvees.filter((_, idx) => idx !== i) }))

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

  const handleClientChange = async (clientId: string) => {
    setForm((f) => ({ ...f, client_id: clientId }))
    const client = clients.find((c) => c.id === Number(clientId))
    if (client) {
      const infosClient = [
        client.nom_domaine,
        client.region,
        client.appellation,
        client.cepages,
        client.type_vin,
      ]
        .filter(Boolean)
        .join(' — ')
      setForm((f) => ({ ...f, demande: infosClient }))

      // Formater toutes les infos du client
      const profil = (client.profil_client_complet || {}) as Record<string, any>
      const lignes: string[] = []

      lignes.push('=== FICHE CLIENT COMPLÈTE ===', '')

      // Infos de base
      lignes.push('IDENTITÉ DU DOMAINE', '---')
      if (client.nom_domaine) lignes.push(`Nom du domaine: ${client.nom_domaine}`)
      if (client.appellation) lignes.push(`Appellation: ${client.appellation}`)
      if (client.region) lignes.push(`Région: ${client.region}`)
      if (client.cepages) lignes.push(`Cépages: ${Array.isArray(client.cepages) ? client.cepages.join(', ') : client.cepages}`)
      if (client.type_vin) lignes.push(`Type de vin: ${client.type_vin}`)
      if (client.email_contact) lignes.push(`Email: ${client.email_contact}`)
      lignes.push('')

      // Présentation
      lignes.push('PRÉSENTATION & POSITIONNEMENT', '---')
      if (client.histoire) lignes.push(`Histoire:\n${client.histoire}`)
      if (client.points_forts) lignes.push(`Points forts:\n${client.points_forts}`)
      if (client.public_cible) lignes.push(`Public cible: ${client.public_cible}`)
      if (client.style) lignes.push(`Style visuel: ${client.style}`)
      if (client.tone_voix) lignes.push(`Ton de communication: ${client.tone_voix}`)
      lignes.push('')

      // Infos du formulaire complet
      if (Object.keys(profil).length > 0) {
        lignes.push('INFORMATIONS SUPPLÉMENTAIRES', '---')

        if (profil.slogan) lignes.push(`Slogan: ${profil.slogan}`)
        if (profil.presentation) lignes.push(`Présentation: ${profil.presentation}`)
        if (profil.liste_cuvees) lignes.push(`Liste de cuvées:\n${profil.liste_cuvees}`)

        // Réseaux sociaux
        const reseaux: string[] = []
        if (profil.reseau_instagram) reseaux.push(`Instagram ${profil.instagram_handle ? '(@' + profil.instagram_handle + ')' : ''}`)
        if (profil.reseau_facebook) reseaux.push(`Facebook ${profil.facebook_page ? '(' + profil.facebook_page + ')' : ''}`)
        if (profil.reseau_linkedin) reseaux.push('LinkedIn')
        if (profil.reseau_tiktok) reseaux.push(`TikTok ${profil.tiktok_handle ? '(@' + profil.tiktok_handle + ')' : ''}`)
        if (reseaux.length > 0) lignes.push(`Réseaux présents: ${reseaux.join(', ')}`)

        if (profil.manager) lignes.push(`Manager/Responsable: ${profil.manager}`)

        // Cibles
        const cibles: string[] = []
        if (profil.cible_particuliers) cibles.push('Particuliers')
        if (profil.cible_cavistes) cibles.push('Cavistes')
        if (profil.cible_restaurants) cibles.push('Restaurants')
        if (profil.cible_export) cibles.push('Export')
        if (profil.cible_professionnels) cibles.push('Professionnels')
        if (cibles.length > 0) lignes.push(`Cibles commerciales: ${cibles.join(', ')}`)

        if (profil.concurrents) lignes.push(`Concurrents: ${profil.concurrents}`)
        if (profil.positionnement) lignes.push(`Positionnement: ${profil.positionnement}`)

        // Objectifs
        const objectifs: string[] = []
        if (profil.obj_vente) objectifs.push('Vente directe')
        if (profil.obj_visibilite) objectifs.push('Visibilité/Notoriété')
        if (profil.obj_fidelite) objectifs.push('Fidélité clients')
        if (profil.obj_recrutement) objectifs.push('Recrutement')
        if (profil.obj_engagement) objectifs.push('Engagement communauté')
        if (profil.obj_conformite) objectifs.push('Conformité légale')
        if (objectifs.length > 0) lignes.push(`Objectifs: ${objectifs.join(', ')}`)

        if (profil.kpi_12mois) lignes.push(`KPI 12 mois: ${profil.kpi_12mois}`)
        if (profil.urgence) lignes.push(`Urgence/Timeline: ${profil.urgence}`)

        lignes.push('')
      }

      lignes.push('SITE & CONTENU ACTUEL', '---')
      if (client.site_url) lignes.push(`Site actuel: ${client.site_url}`)
      if (client.pack_site) lignes.push(`Pack site: ${client.pack_site}`)
      if (profil.site_existant) lignes.push(`Situation site: ${profil.site_existant}`)

      setDescriptionClient(lignes.join('\n'))
    }
  }

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

  const genererPromptWoocommerceFromForm = async () => {
    if (!form.client_id) {
      alert('Sélectionne un client d\'abord.')
      return
    }
    const client = clients.find((c) => c.id === Number(form.client_id))
    const profil = (client?.profil_client_complet || {}) as Record<string, any>
    const cuvees = form.cuvees

    const templateLabel = templateOptions.find((t) => t.value === form.template_choisi)?.label || 'Auto'
    const skinLabel = skinOptions.find((s) => s.value === form.skin_choisi)?.label || 'Auto'
    const fontLabel = fontPairings.find((f) => f.name === form.style_polices)?.name || 'Auto'

    const lignes = [
      'Tu crées une boutique WooCommerce pour un domaine viticole.',
      'Elle doit avoir EXACTEMENT le même style et les mêmes couleurs que le site vitrine généré.',
      '',
      '=== INFORMATIONS COMPLÈTES DU DOMAINE ===',
      `Nom : ${client?.nom_domaine || 'Domaine'}`,
      `Région : ${client?.region || ''}`,
      `Appellation : ${client?.appellation || ''}`,
      `Cépages : ${client?.cepages || ''}`,
      `Type : ${client?.type_vin || ''}`,
      client?.histoire && `Histoire : ${client.histoire}`,
      client?.points_forts && `Points forts : ${client.points_forts}`,
      client?.public_cible && `Public cible : ${client.public_cible}`,
      client?.style && `Style souhaité : ${client.style}`,
      client?.tone_voix && `Ton : ${client.tone_voix}`,
      profil.slogan && `Slogan : ${profil.slogan}`,
      profil.messages_cles && `Messages clés : ${profil.messages_cles}`,
      '',
      '=== STYLES ET IDENTITÉ VISUELLE (À REPRODUIRE EXACTEMENT) ===',
      `Structure de page : ${templateLabel}`,
      `Style des éléments : ${skinLabel}`,
      `Polices : ${fontLabel}`,
      form.couleur_principale && `Couleur principale : ${form.couleur_principale}`,
      form.couleur_accent && `Couleur accent : ${form.couleur_accent}`,
      form.couleur_secondaire && `Couleur secondaire : ${form.couleur_secondaire}`,
      '',
      '=== CUVÉES À CRÉER EN TANT QUE PRODUITS WOOCOMMERCE ===',
    ].filter(Boolean)

    if (cuvees.length === 0) {
      lignes.push('Aucune cuvée fournie. Crée 3-5 produits typiques pour ce domaine.')
    } else {
      cuvees.forEach((c, i) => {
        lignes.push(`${i + 1}. ${c.nom || `Cuvée ${i + 1}`}`)
        if (c.description) lignes.push(`   Description : ${c.description}`)
        if (c.photo_url) lignes.push(`   Photo : ${c.photo_url}`)
        lignes.push('')
      })
    }

    lignes.push(
      '=== STRUCTURE WOOCOMMERCE À CRÉER ===',
      '',
      'Pour chaque cuvée :',
      '1. Nom : exactement tel que fourni',
      '2. Prix : laisse vide (à remplir manuellement)',
      '3. Description courte : 50-100 mots, style gustatif et accords',
      '4. Description longue : description complète fournie',
      '5. Image : si photo fournie, la mettre en avant',
      '6. Catégories : Vins Rouges / Blancs / Rosés',
      '7. Étiquettes : cépage, millésime, terroir',
      '8. Stock : à mettre à jour après chaque vente',
      '',
      '=== CONFIGURATION BOUTIQUE (STYLE IDENTIQUE AU SITE VITRINE) ===',
      `Page d'accueil : "Nos cuvées à la vente"`,
      'Logo : EXACT même logo que le site vitrine',
      'Couleurs : EXACT même palette que le site vitrine',
      'Boutons et cartes : EXACT même style que le site vitrine',
      'Polices : EXACT mêmes polices que le site vitrine',
      'Paiement : PayPal et/ou Stripe',
      'Livraison : zones géographiques et tarifs',
      'Ton : ' + (client?.tone_voix || 'authentique'),
      '',
      'Crée les fiches produit WooCommerce avec le même design que le site vitrine.'
    )

    const txt = `PROMPT WOOCOMMERCE — ${client?.nom_domaine || 'Domaine'}\n\n${lignes.join('\n')}`
    setPromptModal({ visible: true, prompt: txt })
  }

  const generate = async () => {
    if (!form.client_id) {
      alert('Sélectionne un client.')
      return
    }

    const client = clients.find((c) => c.id === Number(form.client_id))
    const profil = (client?.profil_client_complet || {}) as Record<string, any>
    const templateLabel = templateOptions.find((t) => t.value === form.template_choisi)?.label || 'Non spécifié'
    const skinLabel = skinOptions.find((s) => s.value === form.skin_choisi)?.label || 'Non spécifié'
    const fontLabel = fontPairings.find((f) => f.name === form.style_polices)?.name || 'Non spécifié'

    // SITE VITRINE (tous les packs)
    const lignes = [
        'Tu crées un site Web complet pour un domaine viticole.',
        '',
        '## IDENTITÉ & BRANDING DU DOMAINE',
        '',
        `**Nom du domaine:** ${client?.nom_domaine}`,
        `**Région:** ${client?.region}`,
        `**Appellation:** ${client?.appellation}`,
        `**Cépages:** ${client?.cepages}`,
        `**Type de vins:** ${client?.type_vin}`,
        `**Email contact:** ${client?.email_contact || ''}`,
        client?.histoire ? `**Histoire du domaine:**\n${client.histoire}` : '',
        client?.points_forts ? `**Points forts:**\n${client.points_forts}` : '',
        client?.public_cible ? `**Public cible:** ${client.public_cible}` : '',
        client?.style ? `**Style souhaité:** ${client.style}` : '',
        client?.tone_voix ? `**Ton de communication:** ${client.tone_voix}` : '',
        profil.slogan ? `**Slogan site:** ${profil.slogan}` : form.slogan ? `**Slogan site:** ${form.slogan}` : '',
        profil.messages_cles ? `**Messages clés:**\n${profil.messages_cles}` : '',
        '',
        '## STYLES & MISE EN PAGE',
        '',
        `**Pack:** ${form.pack.toUpperCase()}`,
        `**Structure de page:** ${templateLabel}`,
        `**Style des éléments:** ${skinLabel}`,
        `**Polices:** ${fontLabel}`,
        `**Couleur principale:** ${form.couleur_principale}`,
        `**Couleur accent:** ${form.couleur_accent}`,
        `**Couleur secondaire:** ${form.couleur_secondaire}`,
        '',
        '## CUVÉES À INTÉGRER',
        '',
      ].filter(Boolean)

      if (form.cuvees.length === 0) {
        lignes.push('Pas de cuvées fournies. Crée 4-6 cuvées représentatives du domaine.')
      } else {
        form.cuvees.forEach((c, i) => {
          lignes.push(`**${i + 1}. ${c.nom}**`)
          if (c.description) lignes.push(c.description)
          if (c.photo_url) lignes.push(`Image: ${c.photo_url}`)
          lignes.push('')
        })
      }

      lignes.push(
        '## MÉDIAS & ASSETS',
        '',
        form.logo_url ? `**Logo:** ${form.logo_url}` : '**Logo:** À fournir au client',
        form.hero_url ? `**Image héro:** ${form.hero_url}` : '**Image héro:** À fournir au client',
        form.da_urls.length > 0 ? `**Direction artistique:** ${form.da_urls.join(', ')}` : '',
        form.media_urls.length > 0 ? `**Autres médias:** ${form.media_urls.join(', ')}` : '',
        '',
        '## STRUCTURE DU SITE',
        '',
        'Pages obligatoires:',
        '- Accueil (hero, présentation, cuvées en grille/carousel)',
        '- Présentation du domaine',
        '- Nos cuvées (avec détails, photos, descriptions)',
        '- Contact (formulaire + localisation)',
        '- Blog/Actualités (optionnel)',
        '',
        '## INSTRUCTIONS TECHNIQUES',
        '',
        '1. Crée un site HTML/CSS responsive (mobile-first)',
        `2. Utilise les polices Google: ${fontLabel}`,
        `3. Applique le schéma de couleurs: principale ${form.couleur_principale}, accent ${form.couleur_accent}`,
        `4. Respecte la mise en page: ${templateLabel}`,
        `5. Style des éléments: ${skinLabel}`,
        '6. Navigation cohérente et intuitive',
        '7. Images optimisées (lazy-loading)',
        '8. SEO-friendly (meta, structured data)',
        '9. Loi Evin (L3323-4): pas d\'ambiance festive, pas de personnes qui boivent',
        '10. Responsive sur mobile/tablet/desktop',
        '',
        '## LIVRABLES',
        '',
        '- Dossier `/site/` avec structure HTML complète',
        '- `/site/css/style.css` avec variables de couleurs',
        '- `/site/js/main.js` si interactions nécessaires',
        '- Images placeholders avec chemins corrects',
        '- `/site/index.html`, `/site/domaine.html`, `/site/cuvees.html`, `/site/contact.html`, etc.',
        '- ZIP du dossier complet prêt à déployer',
        '',
        '## NOTES',
        '',
        form.demande ? `**Notes client:** ${form.demande}` : '',
        `**Créé pour:** ${client?.nom_domaine}`,
        `**Date:** ${new Date().toLocaleDateString('fr-FR')}`,
      )

      const prompt = lignes.join('\n')
      setPromptModal({ visible: true, prompt })
  }

  const clientName = (id: number) => clients.find((c) => c.id === id)?.nom_domaine || 'Domaine'

  const currentClient = clients.find((c) => c.id === Number(form.client_id))

  return (
    <div className="min-h-screen" style={{ background: '#1a1a1a' }}>
      <style>{`
        .gen-wrap { max-width: 1400px; margin: 0 auto; padding: 2rem; }
        .gen-header { margin-bottom: 2rem; }
        .gen-header h1 { font-family: 'Cormorant Garamond', serif; font-size: 2rem; margin-bottom: .5rem; color: #F5F2EC; }
        .gen-header p { color: rgba(245,242,236,.6); font-size: .95rem; }

        .gen-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; }
        @media (max-width: 1000px) { .gen-grid { grid-template-columns: 1fr; } }

        .gen-panel { background: rgba(255,255,255,.015); border: 1px solid rgba(176,141,87,.2); border-radius: 12px; padding: 1.5rem; }
        .gen-panel h2 { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; color: #b08d57; margin-bottom: 1rem; padding-bottom: .8rem; border-bottom: 1px solid rgba(176,141,87,.2); }
        .gen-panel h3 { font-size: .95rem; color: #F5F2EC; margin-top: 1.2rem; margin-bottom: .6rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }

        .form-group { margin-bottom: 1rem; }
        .form-label { display: block; font-size: .8rem; text-transform: uppercase; letter-spacing: .1em; color: #b08d57; margin-bottom: .4rem; font-weight: 500; }
        .form-input, .form-select, .form-textarea { width: 100%; padding: .7rem; background: rgba(0,0,0,.45); border: 1px solid rgba(255,255,255,.12); color: #f5f2ec; border-radius: 8px; font-family: inherit; font-size: .9rem; outline: none; }
        .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: #b08d57; background: rgba(0,0,0,.7); }
        .form-textarea { min-height: 80px; font-family: monospace; font-size: .85rem; resize: vertical; }

        .clients-list { max-height: 280px; overflow-y: auto; background: rgba(0,0,0,.3); border-radius: 8px; margin-bottom: 1rem; border: 1px solid rgba(176,141,87,.15); }
        .client-item { padding: .7rem 1rem; border-bottom: 1px solid rgba(255,255,255,.08); cursor: pointer; transition: background .2s; }
        .client-item:hover { background: rgba(176,141,87,.15); }
        .client-item.active { background: rgba(176,141,87,.25); color: #b08d57; font-weight: 500; }
        .client-item small { display: block; font-size: .75rem; color: rgba(245,242,236,.5); margin-top: .2rem; }

        .style-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .style-option { padding: 1rem; background: rgba(0,0,0,.3); border: 2px solid rgba(176,141,87,.2); border-radius: 8px; cursor: pointer; transition: all .2s; }
        .style-option:hover { border-color: #b08d57; background: rgba(176,141,87,.1); }
        .style-option.active { border-color: #b08d57; background: rgba(176,141,87,.25); }
        .style-option label { display: block; font-weight: 600; color: #F5F2EC; margin-bottom: .3rem; cursor: pointer; }
        .style-option small { color: rgba(245,242,236,.6); font-size: .8rem; }

        .cuvee-item { background: rgba(176,141,87,.08); border-left: 3px solid #b08d57; padding: 1rem; margin-bottom: .8rem; border-radius: 4px; }
        .cuvee-item h4 { margin: 0 0 .5rem 0; color: #b08d57; font-weight: 500; font-size: .95rem; }
        .cuvee-fields { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }

        .btn-row { display: flex; gap: .5rem; flex-wrap: wrap; }
        .btn { padding: .65rem 1.2rem; border-radius: 6px; font-weight: 600; border: none; cursor: pointer; font-family: inherit; font-size: .85rem; text-decoration: none; display: inline-block; }
        .btn-primary { background: #b08d57; color: #1a1a1a; }
        .btn-primary:hover { background: #c9a971; }
        .btn-secondary { background: rgba(255,255,255,.1); color: #f5f2ec; border: 1px solid rgba(255,255,255,.25); }
        .btn-secondary:hover { border-color: #b08d57; color: #b08d57; }
        .btn:disabled { opacity: .6; cursor: not-allowed; }

        .sites-list { max-height: 500px; overflow-y: auto; }
        .site-card { padding: 1rem; background: rgba(176,141,87,.08); border-left: 3px solid #b08d57; margin-bottom: .8rem; border-radius: 4px; }
        .site-card h4 { margin: 0 0 .4rem 0; color: #F5F2EC; font-weight: 600; }
        .site-card small { display: block; color: rgba(245,242,236,.6); margin-bottom: .6rem; }
        .site-status { display: inline-block; padding: .3rem .8rem; background: rgba(176,141,87,.3); color: #b08d57; border-radius: 4px; font-size: .75rem; font-weight: 600; text-transform: uppercase; }
        .site-actions { display: flex; gap: .5rem; margin-top: .6rem; flex-wrap: wrap; }
        .site-actions button { padding: .4rem .8rem; font-size: .8rem; }
      `}</style>

      <div className="gen-wrap">
        <div className="gen-header">
          <h1>Créateur de site</h1>
          <p>Sélectionne un client → Configure les styles et cuvées → Génère l'aperçu</p>
        </div>

        <div className="gen-grid">
          {/* COLONNE 1 : CLIENT & STYLES */}
          <div className="gen-panel">
            <h2>1. Client et styles</h2>

            <h3>Sélectionner le client</h3>
            <div className="clients-list">
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(245,242,236,.5)' }}>Chargement...</div>
              ) : (
                clients.map((c) => (
                  <div
                    key={c.id}
                    className={`client-item ${form.client_id === String(c.id) ? 'active' : ''}`}
                    onClick={() => handleClientChange(String(c.id))}
                  >
                    <strong>{c.nom_domaine}</strong>
                    <small>{c.appellation} • {c.region}</small>
                  </div>
                ))
              )}
            </div>

            {currentClient && (
              <>
                <h3>Infos client</h3>
                <div className="form-group">
                  <label className="form-label">Domaine</label>
                  <input type="text" className="form-input" value={currentClient.nom_domaine} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Appellation</label>
                  <input type="text" className="form-input" value={currentClient.appellation || ''} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Type de vin</label>
                  <input type="text" className="form-input" value={currentClient.type_vin || ''} disabled />
                </div>

                <h3>Fiche client complète</h3>
                <div className="form-group">
                  <textarea
                    className="form-textarea"
                    value={descriptionClient}
                    readOnly
                    style={{ minHeight: '300px', maxHeight: '400px' }}
                  />
                </div>
              </>
            )}

            <h3>Mise en page</h3>
            <div className="style-grid">
              {templateOptions.map((t) => (
                <div
                  key={t.value}
                  className={`style-option ${form.template_choisi === t.value ? 'active' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, template_choisi: t.value }))}
                >
                  <label>{t.label}</label>
                </div>
              ))}
            </div>

            <h3>Style des éléments</h3>
            <div className="style-grid">
              {skinOptions.map((s) => (
                <div
                  key={s.value}
                  className={`style-option ${form.skin_choisi === s.value ? 'active' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, skin_choisi: s.value }))}
                >
                  <label>{s.label}</label>
                </div>
              ))}
            </div>

            <h3>Palette de couleurs</h3>
            <div className="form-group">
              <select
                className="form-select"
                value={colorPalettes.findIndex((p) => p.principale === form.couleur_principale)}
                onChange={(e) => {
                  const palette = colorPalettes[parseInt(e.target.value)]
                  if (palette) {
                    setForm((f) => ({
                      ...f,
                      couleur_principale: palette.principale,
                      couleur_secondaire: palette.secondaire,
                      couleur_accent: palette.accent,
                    }))
                  }
                }}
              >
                {colorPalettes.map((p, i) => (
                  <option key={i} value={i}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {form.couleur_principale && (
              <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}>
                <div style={{ width: '30px', height: '30px', background: form.couleur_principale, borderRadius: '4px', border: '1px solid rgba(255,255,255,.2)' }} />
                <div style={{ width: '30px', height: '30px', background: form.couleur_accent, borderRadius: '4px', border: '1px solid rgba(255,255,255,.2)' }} />
                <div style={{ width: '30px', height: '30px', background: form.couleur_secondaire, borderRadius: '4px', border: '1px solid rgba(255,255,255,.2)' }} />
              </div>
            )}

            <h3>Polices</h3>
            <div className="form-group">
              <select
                className="form-select"
                value={form.style_polices || ''}
                onChange={(e) => setForm((f) => ({ ...f, style_polices: e.target.value }))}
              >
                <option value="">Choisir...</option>
                {fontPairings.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="btn-row" style={{ marginTop: '1.5rem' }}>
              <button onClick={randomizeAll} className="btn btn-secondary" title="Tire au sort tous les styles">
                🎲 Aléatoire
              </button>
            </div>
          </div>

          {/* COLONNE 2 : CONTENU & MÉDIA */}
          <div className="gen-panel">
            <h2>2. Contenu et médias</h2>

            <h3>Pack</h3>
            <div className="form-group">
              <select className="form-select" value={form.pack} onChange={(e) => setForm((f) => ({ ...f, pack: e.target.value }))}>
                {packs.map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <h3>Infos du site</h3>
            <div className="form-group">
              <label className="form-label">Slogan</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex. Vins authentiques du terroir"
                value={form.slogan}
                onChange={(e) => setForm((f) => ({ ...f, slogan: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Demande / Notes</label>
              <textarea
                className="form-textarea"
                placeholder="Infos client, notes spéciales..."
                value={form.demande}
                onChange={(e) => setForm((f) => ({ ...f, demande: e.target.value }))}
              />
            </div>

            <h3>Cuvées (4 min.)</h3>
            <div style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: '1rem' }}>
              {form.cuvees.map((c, i) => (
                <div key={i} className="cuvee-item">
                  <h4>Cuvée {i + 1}</h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem', marginBottom: '.6rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Nom</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Nom du vin"
                        value={c.nom}
                        onChange={(e) => modifierCuvee(i, 'nom', e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Prix (€)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ex. 15.50"
                        value={c.prix || ''}
                        onChange={(e) => modifierCuvee(i, 'prix', e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Alcool (%)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ex. 12.5"
                        value={c.alcool || ''}
                        onChange={(e) => modifierCuvee(i, 'alcool', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '.6rem' }}>
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Description du vin"
                      style={{ minHeight: '60px' }}
                      value={c.description}
                      onChange={(e) => modifierCuvee(i, 'description', e.target.value)}
                    />
                  </div>

                  <style>{`
                    .tag-input-wrapper { margin-bottom: .6rem; }
                    .tag-input-label { display: block; font-size: .8rem; text-transform: uppercase; letter-spacing: .1em; color: #b08d57; margin-bottom: .4rem; font-weight: 500; }
                    .tag-input-field { width: 100%; padding: .7rem; background: rgba(0,0,0,.45); border: 1px solid rgba(255,255,255,.12); color: #f5f2ec; border-radius: 8px; font-family: inherit; font-size: .9rem; outline: none; }
                    .tag-input-field:focus { border-color: #b08d57; background: rgba(0,0,0,.7); }
                    .tag-container { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .4rem; }
                    .tag { display: inline-block; padding: .4rem .8rem; background: rgba(176,141,87,.3); border: 1px solid rgba(176,141,87,.5); color: #b08d57; border-radius: 20px; font-size: .8rem; font-weight: 500; cursor: pointer; transition: all .2s; }
                    .tag:hover { background: rgba(176,141,87,.5); }
                    .tag-remove { margin-left: .4rem; cursor: pointer; opacity: .7; }
                    .tag-remove:hover { opacity: 1; }
                    .tag-suggestions { display: flex; flex-wrap: wrap; gap: .3rem; max-height: 80px; overflow-y: auto; }
                    .tag-option { padding: .3rem .6rem; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15); color: #f5f2ec; border-radius: 4px; font-size: .8rem; cursor: pointer; transition: all .2s; }
                    .tag-option:hover { background: rgba(176,141,87,.2); border-color: #b08d57; }
                  `}</style>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem', marginBottom: '.6rem' }}>
                    <div className="tag-input-wrapper">
                      <label className="tag-input-label">Arômes primaires</label>
                      <input
                        type="text"
                        className="tag-input-field"
                        placeholder="Chercher..."
                        value={searchAromes.primaires}
                        onChange={(e) => setSearchAromes((s) => ({ ...s, primaires: e.target.value }))}
                      />
                      <div className="tag-container">
                        {(c.aromes_primaires || []).map((arome) => (
                          <div key={arome} className="tag">
                            {arome}
                            <span className="tag-remove" onClick={() => setForm((f) => ({ ...f, cuvees: f.cuvees.map((cv, idx) => idx === i ? { ...cv, aromes_primaires: (cv.aromes_primaires || []).filter((a) => a !== arome) } : cv) }))}>×</span>
                          </div>
                        ))}
                      </div>
                      <div className="tag-suggestions">
                        {aromePrimaires
                          .filter((a) => !c.aromes_primaires?.includes(a) && a.toLowerCase().includes(searchAromes.primaires.toLowerCase()))
                          .map((arome) => (
                            <div key={arome} className="tag-option" onClick={() => { setForm((f) => ({ ...f, cuvees: f.cuvees.map((cv, idx) => idx === i ? { ...cv, aromes_primaires: [...(cv.aromes_primaires || []), arome] } : cv) })); setSearchAromes((s) => ({ ...s, primaires: '' })); }}>
                              + {arome}
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="tag-input-wrapper">
                      <label className="tag-input-label">Arômes secondaires</label>
                      <input
                        type="text"
                        className="tag-input-field"
                        placeholder="Chercher..."
                        value={searchAromes.secondaires}
                        onChange={(e) => setSearchAromes((s) => ({ ...s, secondaires: e.target.value }))}
                      />
                      <div className="tag-container">
                        {(c.aromes_secondaires || []).map((arome) => (
                          <div key={arome} className="tag">
                            {arome}
                            <span className="tag-remove" onClick={() => setForm((f) => ({ ...f, cuvees: f.cuvees.map((cv, idx) => idx === i ? { ...cv, aromes_secondaires: (cv.aromes_secondaires || []).filter((a) => a !== arome) } : cv) }))}>×</span>
                          </div>
                        ))}
                      </div>
                      <div className="tag-suggestions">
                        {aromeSecondaires
                          .filter((a) => !c.aromes_secondaires?.includes(a) && a.toLowerCase().includes(searchAromes.secondaires.toLowerCase()))
                          .map((arome) => (
                            <div key={arome} className="tag-option" onClick={() => { setForm((f) => ({ ...f, cuvees: f.cuvees.map((cv, idx) => idx === i ? { ...cv, aromes_secondaires: [...(cv.aromes_secondaires || []), arome] } : cv) })); setSearchAromes((s) => ({ ...s, secondaires: '' })); }}>
                              + {arome}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="tag-input-wrapper">
                    <label className="tag-input-label">Cépages</label>
                    <input
                      type="text"
                      className="tag-input-field"
                      placeholder="Chercher..."
                      value={searchAromes.cepages}
                      onChange={(e) => setSearchAromes((s) => ({ ...s, cepages: e.target.value }))}
                    />
                    <div className="tag-container">
                      {(c.cepages || []).map((cepage) => (
                        <div key={cepage} className="tag">
                          {cepage}
                          <span className="tag-remove" onClick={() => setForm((f) => ({ ...f, cuvees: f.cuvees.map((cv, idx) => idx === i ? { ...cv, cepages: (cv.cepages || []).filter((c) => c !== cepage) } : cv) }))}>×</span>
                        </div>
                      ))}
                    </div>
                    <div className="tag-suggestions">
                      {cepagesList
                        .filter((cepage) => !c.cepages?.includes(cepage) && cepage.toLowerCase().includes(searchAromes.cepages.toLowerCase()))
                        .map((cepage) => (
                          <div key={cepage} className="tag-option" onClick={() => { setForm((f) => ({ ...f, cuvees: f.cuvees.map((cv, idx) => idx === i ? { ...cv, cepages: [...(cv.cepages || []), cepage] } : cv) })); setSearchAromes((s) => ({ ...s, cepages: '' })); }}>
                            + {cepage}
                          </div>
                        ))}
                    </div>
                  </div>

                  {c.photo_url && (
                    <img src={c.photo_url} alt="" style={{ width: '60px', height: '60px', marginBottom: '.5rem', borderRadius: '4px', objectFit: 'cover' }} />
                  )}

                  <div className="btn-row">
                    <button onClick={() => supprimerCuvee(i)} className="btn btn-secondary" style={{ fontSize: '.75rem', padding: '.4rem .8rem' }}>
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={ajouterCuvee} className="btn btn-secondary" style={{ width: '100%', marginBottom: '1rem' }}>
              + Ajouter une cuvée
            </button>

            <h3>Logo & Hero</h3>
            <div className="form-group">
              <label className="form-label">Logo</label>
              <input
                type="file"
                accept="image/*"
                className="form-input"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const url = URL.createObjectURL(file)
                    setForm((f) => ({ ...f, logo_url: url }))
                  }
                }}
              />
              {form.logo_url && <img src={form.logo_url} alt="" style={{ width: '50px', marginTop: '.5rem' }} />}
            </div>

            <div className="form-group">
              <label className="form-label">Image héro</label>
              <input
                type="file"
                accept="image/*"
                className="form-input"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const url = URL.createObjectURL(file)
                    setForm((f) => ({ ...f, hero_url: url }))
                  }
                }}
              />
              {form.hero_url && <img src={form.hero_url} alt="" style={{ width: '80px', marginTop: '.5rem', borderRadius: '4px' }} />}
            </div>
          </div>
        </div>

        {/* ACTIONS & RÉSULTATS */}
        <div className="gen-panel" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <button onClick={generate} disabled={generating || !form.client_id} className="btn btn-primary">
              {generating ? 'Envoi...' : '🌐 Site principal'}
            </button>
            {form.client_id && (
              <button onClick={genererPromptWoocommerceFromForm} className="btn btn-secondary">
                🛍️ Boutique client
              </button>
            )}
          </div>

          <h2 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Aperçus générés</h2>
          <div className="sites-list">
            {sites.length === 0 ? (
              <p style={{ color: 'rgba(245,242,236,.5)', textAlign: 'center', padding: '2rem' }}>Aucun site généré.</p>
            ) : (
              sites.slice(0, 10).map((s) => (
                <div key={s.id} className="site-card">
                  <h4>{clientName(s.client_id)}</h4>
                  <small>
                    {s.pack.toUpperCase()} • {new Date(s.created_at).toLocaleDateString('fr-FR')}
                  </small>
                  <div className="site-status">{statusLabels[s.status as keyof typeof statusLabels] || s.status}</div>
                  <div className="site-actions">
                    {s.html_genere && (
                      <button onClick={() => setPreviewSite(s)} className="btn btn-secondary">
                        Voir aperçu
                      </button>
                    )}
                    {s.status === 'a_valider' && (
                      <button onClick={() => alert('Validation en cours...')} className="btn btn-primary" style={{ fontSize: '.8rem' }}>
                        ✓ Valider
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      {previewSite && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewSite(null)}
        >
          <div className="bg-white rounded-lg w-full max-w-5xl h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-gray-900">Aperçu — {clientName(previewSite.client_id)}</h3>
              <button onClick={() => setPreviewSite(null)} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">
                Fermer
              </button>
            </div>
            <iframe srcDoc={previewSite.html_genere} className="flex-1 w-full" title="Aperçu du site généré" />
          </div>
        </div>
      )}

      {promptModal.visible && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setPromptModal({ visible: false, prompt: '' })}
        >
          <div
            className="bg-white rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col text-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold">Aperçu du Prompt WooCommerce</h3>
              <button onClick={() => setPromptModal({ visible: false, prompt: '' })} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">
                Fermer
              </button>
            </div>
            <textarea
              value={promptModal.prompt}
              onChange={(e) => setPromptModal({ ...promptModal, prompt: e.target.value })}
              className="flex-1 p-4 font-mono text-sm border-b resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2 p-4">
              <button onClick={() => setPromptModal({ visible: false, prompt: '' })} className="px-4 py-2 border rounded hover:bg-gray-50">
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (navigator.clipboard) {
                    await navigator.clipboard.writeText(promptModal.prompt)
                    alert('Prompt copié ✅')
                  }
                  setPromptModal({ visible: false, prompt: '' })
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Copier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
