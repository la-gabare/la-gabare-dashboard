import { lienBrief as lienBriefSigne } from '@/lib/anti-spam'
import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { notifierAgenceLead } from '@/lib/leads/mails'
import { gabaritMail, boutonMail, carteMail, labelMail, listeMail } from '@/lib/mail-cadre'

// Audit gratuit automatique : relevé factuel du site du domaine + rédaction du rapport par Claude,
// envoyé au prospect quelques minutes après sa demande (au lieu d'une réponse manuelle sous 48 h).

// Client créé à la demande : sans clé ANTHROPIC_API_KEY (variable Vercel), seul l'audit automatique est indisponible
let client: Anthropic | null = null
const claude = () => (client ??= new Anthropic())
const AGENCE = process.env.AGENCE_NOTIF_EMAIL || process.env.SMTP_USER || ''
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export interface Releve {
  url: string
  accessible: boolean
  https: boolean
  statut_http?: number
  titre?: string
  description?: string
  mobile?: boolean
  langue?: string
  nb_h1?: number
  nb_mots?: number
  images?: number
  images_sans_alt?: number
  boutique?: boolean
  blog?: boolean
  instagram?: boolean
  facebook?: boolean
  mentions_legales?: boolean
  avertissement_alcool?: boolean
  donnees_structurees?: boolean
  annee_copyright?: number | null
  temps_reponse_ms?: number
  erreur?: string
}

// Relevé objectif de la page d'accueil (aucune interprétation ici : c'est Claude qui rédige)
export async function releverSite(adresse: string): Promise<Releve> {
  let url = adresse.trim()
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  const r: Releve = { url, accessible: false, https: url.startsWith('https://') }
  // Uniquement des sites publics : pas d'adresse IP, de localhost ni de nom sans domaine
  let hote = ''
  try { hote = new URL(url).hostname.toLowerCase() } catch { r.erreur = 'adresse invalide'; return r }
  if (!hote.includes('.') || /^[\d.]+$/.test(hote) || hote.includes(':') || /(^|\.)(localhost|local|internal)$/.test(hote)) {
    r.erreur = 'adresse non publique'
    return r
  }
  const debut = Date.now()
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LaGabareAudit/1.0; +https://la-gabare.fr)' },
    })
    r.temps_reponse_ms = Date.now() - debut
    r.statut_http = res.status
    r.https = res.url.startsWith('https://')
    if (!res.ok) return r
    const html = (await res.text()).slice(0, 600_000)
    const bas = html.toLowerCase()
    const texte = bas.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
    r.accessible = true
    r.titre = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim().slice(0, 200)
    r.description = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)/i)?.[1]?.trim().slice(0, 300)
    r.mobile = /<meta[^>]+name=["']viewport["']/i.test(html)
    r.langue = html.match(/<html[^>]+lang=["']([^"']+)/i)?.[1]
    r.nb_h1 = (bas.match(/<h1[\s>]/g) || []).length
    r.nb_mots = texte.split(/\s+/).filter((m) => m.length > 2).length
    const imgs = html.match(/<img\b[^>]*>/gi) || []
    r.images = imgs.length
    r.images_sans_alt = imgs.filter((i) => !/\balt=["'][^"']+["']/i.test(i)).length
    r.boutique = /boutique|panier|ajouter au panier|add to cart|woocommerce|shop/.test(bas)
    r.blog = /blog|actualit|journal|article/.test(bas)
    r.instagram = bas.includes('instagram.com')
    r.facebook = bas.includes('facebook.com')
    r.mentions_legales = /mentions[ -]l[ée]gales/.test(texte)
    r.avertissement_alcool = /abus d.alcool|consommer avec mod[ée]ration/.test(texte)
    r.donnees_structurees = /application\/ld\+json/.test(bas)
    const annees = (texte.match(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(20\d{2})/g) || [])
      .map((m) => Number(m.match(/(20\d{2})(?!.*20\d{2})/)?.[1])).filter(Boolean)
    r.annee_copyright = annees.length ? Math.max(...annees) : null
  } catch (e) {
    r.temps_reponse_ms = Date.now() - debut
    r.erreur = e instanceof Error ? e.name : 'erreur'
  }
  return r
}

export interface Rapport {
  synthese: string
  points_forts: string[]
  problemes: { titre: string; detail: string }[]
  gains: { titre: string; detail: string }[]
  conformite: string[]
  recommandation: string
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['synthese', 'points_forts', 'problemes', 'gains', 'conformite', 'recommandation'],
  properties: {
    synthese: { type: 'string' },
    points_forts: { type: 'array', items: { type: 'string' } },
    problemes: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['titre', 'detail'], properties: { titre: { type: 'string' }, detail: { type: 'string' } } },
    },
    gains: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['titre', 'detail'], properties: { titre: { type: 'string' }, detail: { type: 'string' } } },
    },
    conformite: { type: 'array', items: { type: 'string' } },
    recommandation: { type: 'string' },
  },
}

const SYSTEME = `Tu es consultant de La Gabare, agence web et communication réservée aux domaines viticoles de la Loire.
Tu rédiges le rapport d'audit gratuit qu'un vigneron reçoit par e-mail après avoir répondu à notre questionnaire.

Règles :
- Français, vouvoiement, ton direct et bienveillant, phrases courtes, pas de jargon technique non expliqué.
- Appuie-toi UNIQUEMENT sur les réponses au questionnaire et sur le relevé du site fournis. N'invente aucun chiffre,
  aucune note Google, aucun nombre d'abonnés ni aucune statistique de trafic. Si une information manque, dis-le simplement.
- Si le site n'a pas pu être consulté (ou s'il n'y en a pas), dis-le et base-toi sur le questionnaire.
- Exactement 3 problèmes et 3 gains, concrets et propres à ce domaine ; 1 à 3 points forts honnêtes.
- Conformité loi Évin : signale uniquement ce que le relevé permet de constater (par exemple l'absence du message
  sanitaire « L'abus d'alcool est dangereux pour la santé, à consommer avec modération »), sans affirmer d'infraction.
- Recommandation : la formule La Gabare adaptée, en une ou deux phrases, à partir de la recommandation indiquée,
  puis une invitation à réserver un appel de 20 minutes. Tarifs HT : sites Essentiel 1 990 €, Pro 4 490 € (boutique en ligne
  et espace professionnels), Premium 6 990 € ; accompagnement Village 150 €, Réserve 350 €, Grand Cru 550 € par mois ;
  chaque pack inclut 3 mois d'accompagnement.
- Pas de formule de politesse ni de signature : elles sont ajoutées autour du rapport.`

export async function redigerRapport(lead: Record<string, any>, releve: Releve | null): Promise<Rapport> {
  const contexte = {
    domaine: lead.domaine || null,
    reponses_questionnaire: lead.besoins || null,
    recommandation_questionnaire: lead.message || null,
    releve_site: releve || 'Aucun site indiqué par le vigneron.',
  }
  const reponse = await claude().beta.messages.create({
    model: 'claude-sonnet-5-5', // choix de l'agence : très bon rapport qualité/coût (≈ 2 centimes par audit)
    max_tokens: 8000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default', // en cas de refus d'un classifieur, l'API bascule seule sur un autre modèle
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEME,
    messages: [{ role: 'user', content: `Données de l'audit :\n${JSON.stringify(contexte, null, 2)}` }],
  }, { timeout: 50_000, maxRetries: 1 })
  if (reponse.stop_reason === 'refusal') throw new Error('Rédaction refusée par le modèle')
  const texte = reponse.content.find((b) => b.type === 'text')
  if (!texte || texte.type !== 'text') throw new Error('Réponse vide')
  return JSON.parse(texte.text) as Rapport
}

// HTML du rapport d'audit (charte e-mail) : pur, prévisualisable
export function mailRapport(lead: Record<string, any>, r: Rapport) {
  const liste = (items: string[]) => listeMail(items.map(esc))
  const blocs = (items: { titre: string; detail: string }[], couleur: string) => items.map((p, i) => carteMail(
    `<p style="margin:0 0 4px 0;font-size:14px;font-weight:600;color:#1A1310;">${i + 1}. ${esc(p.titre)}</p>
     <p style="margin:0;font-size:13px;line-height:1.6;">${esc(p.detail)}</p>`, { bordGauche: couleur, padding: '14px 18px', marge: '0 0 8px 0' })).join('')
  const titre = (t: string) => labelMail(t)
  const rdv = new URLSearchParams({ ...(lead.nom ? { name: lead.nom } : {}), ...(lead.email ? { email: lead.email } : {}), 'metadata[lead_id]': String(lead.id) })
  const lienBrief = lienBriefSigne(lead.id)
  return gabaritMail({
    label: 'Votre audit gratuit',
    titre: esc(lead.domaine || lead.nom || 'Votre domaine'),
    corps: `<p style="margin:0;">${esc(r.synthese)}</p>
  ${r.points_forts.length ? titre('Ce qui fonctionne') + liste(r.points_forts) : ''}
  ${titre('Trois points à corriger')}${blocs(r.problemes, '#5A1226')}
  ${titre('Trois gains à aller chercher')}${blocs(r.gains, '#B08D57')}
  ${r.conformite.length ? titre('Conformité loi Évin') + liste(r.conformite) : ''}
  ${titre('Notre recommandation')}<p style="margin:0 0 24px 0;">${esc(r.recommandation)}</p>
  <p style="margin:0 0 8px 0;">Pour la suite, deux façons de faire, à votre choix :</p>`,
    bouton: { texte: 'Réserver un appel de 20 minutes &rarr;', lien: `https://cal.com/la-gabare/appel-decouverte-la-gabare?${rdv}` },
    apresBouton: `<p style="margin:14px 0 0 0;font-size:13px;color:#7A6F66;">ou, si vous préférez écrire</p>
  ${boutonMail('Compléter le formulaire &rarr;', lienBrief, { secondaire: true, marge: '10px 0 0 0' })}
  <p style="margin:24px 0 0 0;font-size:12px;line-height:1.6;color:#7A6F66;">Audit réalisé à partir de vos réponses et d'une lecture automatique de la page d'accueil de votre site, puis rédigé avec l'aide d'une intelligence artificielle.
  Une question ? Répondez simplement à cet e-mail.</p>`,
  })
}

// Relevé + rédaction + envoi ; idempotent (rien si le rapport est déjà parti)
export async function produireRapportAudit(leadId: number) {
  const { data: lead } = await supabaseAdmin.from('leads').select('*').eq('id', leadId).single()
  if (!lead || lead.type_demande !== 'audit' || lead.rapport_envoye_at || !lead.email) return null
  const releve = lead.url ? await releverSite(lead.url) : null
  const rapport = await redigerRapport(lead, releve)
  await sendMail(lead.email, `Votre audit gratuit — ${lead.domaine || 'votre domaine'}`, mailRapport(lead, rapport),
    { fromName: 'La Gabare', replyTo: AGENCE || undefined })
  await supabaseAdmin.from('leads').update({
    rapport_audit: { ...rapport, releve }, rapport_envoye_at: new Date().toISOString(),
  }).eq('id', lead.id)
  if (AGENCE) {
    await sendMail(AGENCE, `Rapport d'audit envoyé — ${lead.domaine || lead.nom}`, mailRapport(lead, rapport), { fromName: 'La Gabare — Audits', replyTo: lead.email })
  }
  return rapport
}

// Rattrapage (tâche quotidienne) : audits sans rapport depuis plus de 15 minutes, un par passage (durée limitée)
export async function rattraperRapports() {
  const bilan = { envoyes: 0, echecs: 0 }
  const avant = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const depuis = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabaseAdmin.from('leads').select('*').eq('type_demande', 'audit')
    .is('rapport_envoye_at', null).lt('created_at', avant).gt('created_at', depuis).limit(1)
  for (const lead of data || []) {
    try {
      await produireRapportAudit(lead.id)
      await supabaseAdmin.from('leads').update({ statut: 'mail_envoye', mail_envoye_at: new Date().toISOString() }).eq('id', lead.id)
      bilan.envoyes++
    } catch (e) {
      console.error('rattrapage rapport audit', lead.id, e)
      // Échec répété : l'agence reprend la main avec le mail de prise de contact classique
      try { await notifierAgenceLead(lead, false) } catch { /* rien */ }
      await supabaseAdmin.from('leads').update({ rapport_envoye_at: new Date().toISOString(), rapport_audit: { erreur: String(e) } }).eq('id', lead.id)
      bilan.echecs++
    }
  }
  return bilan
}
