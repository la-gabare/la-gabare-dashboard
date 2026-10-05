// Scoring (100 pts), recommandation d'offre et génération de messages.
// Port fidèle de l'outil local de prospection (server.py).
import { COOP_CODES, EFF_LABEL, OFFERS, PackName, AboName } from './constants'
import type { Prospect, Settings, Signal } from './types'

const NOW_YEAR = () => new Date().getFullYear()

export function fmtEur(v: number | null | undefined): string {
  if (v == null) return '—'
  if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace('.', ',')} M€`
  if (v >= 1e3) return `${Math.round(v / 1e3)} k€`
  return `${Math.round(v)} €`
}

export function titleCase(s: string | null | undefined): string {
  return (s || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export interface ScoreResult {
  score: number
  prio: 'A' | 'B' | 'C'
  pack: PackName | null
  abo: AboName
  deal: number
  mrr: number
  signals: Signal[]
  breakdown: Record<string, number>
  pitch: string[]
}

type L = Partial<Prospect> & { site_status: string }

export function scoreLead(P: L): ScoreResult {
  const NY = NOW_YEAR()
  const st = P.site_status || 'inconnu'
  const audit = P.audit || null
  const socials = P.socials || {}
  const eff = P.eff_mid ?? null
  const employer = eff !== null && P.eff_code != null && P.eff_code !== 'NN'
  const ca = P.ca || 0
  const signals: Signal[] = []
  const pitch: string[] = []

  // A. Besoin de site (35)
  let A = ({ aucun: 35, hs: 35, obsolete: 30, vieillissant: 18, moderne: 5, inconnu: 15 } as Record<string, number>)[st] ?? 15
  if (st === 'aucun') {
    const confirmed = P.url_source === 'manual' || P.url_source === 'search'
    if (!confirmed) A = 26 // détection automatique : probable mais pas certaine
    signals.push({ k: 'nosite', label: P.url_source === 'search' ? 'Sans site (vérifié par recherche)' : confirmed ? 'Sans site web' : 'Sans site (à confirmer)', tone: 'hot' })
    pitch.push('Aucun site trouvé : pack de création complet (vitrine + vente directe).' + (confirmed ? '' : ' À confirmer par une recherche Google avant contact.'))
  } else if (st === 'hs') {
    signals.push({ k: 'hs', label: 'Site injoignable', tone: 'hot' })
    pitch.push('Le site déclaré ne répond plus : refonte urgente.')
  } else if (st === 'obsolete') {
    signals.push({ k: 'obsolete', label: 'Site obsolète', tone: 'hot' })
    pitch.push(`Site obsolète (${(audit?.issues || []).slice(0, 2).join(', ')}) : refonte avec design sur-mesure.`)
  } else if (st === 'vieillissant') {
    signals.push({ k: 'aging', label: 'Site vieillissant', tone: 'warm' })
    pitch.push('Site vieillissant : modernisation + SEO local.')
  } else if (st === 'moderne') {
    signals.push({ k: 'ok', label: 'Site correct', tone: 'info' })
    pitch.push("Site correct : miser sur l'accompagnement mensuel (contenu, réseaux, Évin).")
  }

  // B. Besoin de communication (20)
  let B: number
  if (audit && !audit.error && ['moderne', 'vieillissant', 'obsolete'].includes(st)) {
    B = 0
    if (!(socials.instagram || socials.facebook)) {
      B += 8
      signals.push({ k: 'nosocial', label: 'Aucun réseau social', tone: 'hot' })
      pitch.push('Aucun réseau social détecté : offre Réserve (gestion Instagram/Facebook).')
    } else if (!socials.instagram) {
      B += 3
      signals.push({ k: 'noinsta', label: "Pas d'Instagram", tone: 'warm' })
    }
    if (!audit.blog) {
      B += 6
      pitch.push('Pas de blog/actualités : 4 à 8 articles/mois pour le référencement.')
    }
    if (!audit.sanitary) {
      B += 4
      signals.push({ k: 'noevin', label: 'Message sanitaire absent', tone: 'warm' })
      pitch.push('Message sanitaire loi Évin absent : angle conformité (10 points de contrôle).')
    }
    if (!audit.age_gate) B += 2
    if (!audit.shop && (eff || 0) >= 3) {
      B += 3
      signals.push({ k: 'noshop', label: 'Pas de vente en ligne', tone: 'warm' })
      pitch.push('Pas de boutique en ligne malgré la taille : pack Pro.')
    }
    if (audit.tourism && !audit.booking) {
      B += 2
      pitch.push('Accueil/dégustation sans réservation en ligne : pack Premium.')
    }
  } else if (st === 'aucun' || st === 'hs') {
    B = socials.instagram || socials.facebook ? 8 : 14
  } else {
    B = 8
  }
  B = Math.min(B, 20)

  // C. Capacité à investir (25)
  let cEff: number
  if (!employer || (eff as number) <= 0) cEff = 3
  else if ((eff as number) <= 2) cEff = 8
  else if ((eff as number) <= 5) cEff = 14
  else if ((eff as number) <= 9) cEff = 18
  else if ((eff as number) <= 19) cEff = 22
  else cEff = 25
  const cCa = ca >= 2e6 ? 25 : ca >= 1e6 ? 22 : ca >= 5e5 ? 18 : ca >= 2.5e5 ? 14 : ca >= 1e5 ? 9 : ca > 0 ? 5 : 0
  const C = Math.max(cEff, cCa)
  if (employer && (eff as number) >= 3) signals.push({ k: 'employer', label: `Employeur (${EFF_LABEL[P.eff_code as string] || '?'} sal.)`, tone: 'ok' })
  if (ca >= 5e5) signals.push({ k: 'ca', label: `CA ${fmtEur(ca)}`, tone: 'ok' })

  // D. Timing / expansion (20)
  let D = 0
  const createdYear = parseInt((P.created || '0000').slice(0, 4), 10)
  const ageCo = Number.isFinite(createdYear) && createdYear > 0 ? NY - createdYear : 99
  if (ageCo <= 6) {
    D += 6
    signals.push({ k: 'recent', label: `Création récente (${createdYear})`, tone: 'hot' })
    pitch.push(`Entreprise récente (${createdYear}) : besoin de construire sa notoriété.`)
  }
  if ((P.nb_open || 0) >= 2) {
    D += 5
    signals.push({ k: 'multi', label: `${P.nb_open} établissements`, tone: 'hot' })
    pitch.push(`${P.nb_open} établissements ouverts : signe d'expansion (pack Premium / Grand Cru).`)
  }
  if (P.successor) {
    D += 6
    signals.push({ k: 'transmission', label: 'Transmission en cours', tone: 'hot' })
    pitch.push('Transmission générationnelle probable : moment idéal pour une refonte.')
  } else if (P.dir_birth && NY - P.dir_birth >= 60) {
    D += 2
    signals.push({ k: 'senior', label: `Dirigeant ${NY - P.dir_birth} ans`, tone: 'info' })
  }
  if (P.ca && P.ca_prev && P.ca_prev > 0) {
    const g = (P.ca - P.ca_prev) / P.ca_prev
    if (g >= 0.1) {
      D += 8
      signals.push({ k: 'growth', label: `CA en hausse (+${Math.round(g * 100)} %)`, tone: 'hot' })
      pitch.push(`CA en croissance (+${Math.round(g * 100)} %) : vigneron en développement.`)
    }
  }
  const gbp = P.gbp
  if (gbp && gbp.reviews) {
    signals.push({ k: 'gbp', label: `Google ${gbp.rating}★ (${gbp.reviews} avis)`, tone: 'ok' })
    if ((gbp.reviews || 0) >= 30) {
      D += 2
      pitch.push(`Fiche Google active (${gbp.reviews} avis) : réponse aux avis sous 24 h incluse en Grand Cru.`)
    }
  }
  if (P.bio) {
    D += 3
    signals.push({ k: 'bio', label: 'Certifié bio', tone: 'ok' })
    pitch.push('Certification bio : récit de marque à valoriser (storytelling terroir).')
  }
  if (P.vinifie) {
    D += 2
    signals.push({ k: 'vinifie', label: 'Vinifie / vend du vin', tone: 'ok' })
  }
  D = Math.min(D, 20)

  let total = A + B + C + D
  // Pondération qualité
  let mult = 1
  if (P.coop) {
    mult = 0.1
    signals.push({ k: 'coop', label: 'Coopérative', tone: 'bad' })
  } else if ((eff || 0) >= 50 || ca >= 2e7) {
    mult = 0.35
    signals.push({ k: 'big', label: 'Grande structure (équipe marketing)', tone: 'bad' })
  } else if (!P.vinifie && !employer && !ca) {
    mult = 0.6
    signals.push({ k: 'coopteur', label: 'Coopérateur possible', tone: 'bad' })
  }
  total = Math.round(total * mult * 10) / 10
  const prio: 'A' | 'B' | 'C' = total >= 62 ? 'A' : total >= 42 ? 'B' : 'C'

  // Recommandation d'offre
  const effV = eff || 0
  const tourism = !!(audit && audit.tourism)
  let pack: PackName | null
  if (effV >= 10 || (P.nb_open || 0) >= 3 || ca >= 1.5e6 || (tourism && effV >= 3)) pack = 'Premium'
  else if (effV >= 3 || ca >= 4e5 || (P.nb_open || 0) >= 2) pack = 'Pro'
  else pack = 'Essentiel'
  let abo: AboName
  if ((effV >= 10 && (P.successor || (P.nb_open || 0) >= 2)) || ca >= 2e6 || (tourism && effV >= 6)) abo = 'Grand Cru'
  else if (effV >= 3 || ca >= 3e5 || st === 'aucun' || st === 'hs') abo = 'Réserve'
  else abo = 'Village'
  if (effV < 3 && ca < 3e5 && st !== 'aucun' && st !== 'hs' && !audit) abo = 'Village'
  if (st === 'moderne') pack = null
  const deal = (pack ? OFFERS.packs[pack].price : 0) + 12 * OFFERS.abos[abo].price

  return {
    score: total, prio, pack, abo, deal, mrr: OFFERS.abos[abo].price, signals,
    breakdown: { site: A, communication: B, capacite: C, timing: D, qualite: mult }, pitch,
  }
}

/** Colonnes dérivées (filtres rapides côté base). */
export function deriveColumns(P: L) {
  const audit = P.audit && !P.audit.error ? P.audit : null
  const socials = P.socials || {}
  const employer = P.eff_mid != null && P.eff_code != null && P.eff_code !== 'NN'
  return {
    growth: P.ca && P.ca_prev && P.ca_prev > 0 && P.ca >= P.ca_prev * 1.1 ? 1 : 0,
    coopteur: !P.coop && !P.vinifie && !employer && !(P.ca || 0) ? 1 : 0,
    obs: audit && typeof audit.obsolescence === 'number' ? audit.obsolescence : null,
    f_no_social: audit && !(socials.instagram || socials.facebook) ? 1 : 0,
    f_no_shop: audit && audit.shop === false ? 1 : 0,
    f_no_evin: audit && audit.sanitary === false ? 1 : 0,
    f_no_mobile: audit && audit.viewport === false ? 1 : 0,
    f_no_https: audit && audit.https === false ? 1 : 0,
    f_tourism: audit && audit.tourism ? 1 : 0,
  }
}

/** Calcule toutes les colonnes dépendantes du score pour une fiche. */
export function computeScoreColumns(P: L) {
  const r = scoreLead(P)
  return {
    score: r.score, prio: r.prio, pack: r.pack, abo: r.abo, deal: r.deal, mrr: r.mrr,
    signals: r.signals, breakdown: r.breakdown, ...deriveColumns(P),
  }
}

// --------------------------------------------------------------------------- //
//  Messages
// --------------------------------------------------------------------------- //
const spaced = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

export function buildMessage(P: Prospect, settings: Settings) {
  const audit = P.audit && !P.audit.error ? P.audit : null
  const sc = scoreLead(P)
  const first = P.dir_first && P.legal_code === '1000' ? P.dir_first : null
  const hello = first ? `Bonjour ${first},` : 'Bonjour,'
  const dom = titleCase((P.brand || P.name || 'votre domaine').replace(/\(.*?\)/g, '').trim())
  const zone = P.zone && P.zone !== 'Hors zone' ? P.zone : 'la Loire'
  const me = settings.sender_name || '[Votre prénom]'
  const status = P.site_status
  let subject = ''
  let hook = ''
  let value = ''
  const pk = (sc.pack || 'Essentiel') as PackName
  if (status === 'aucun' || status === 'hs') {
    subject = `${dom} : une vitrine en ligne pour vos vins ?`
    hook =
      status === 'aucun'
        ? `Je vous écris car je n'ai pas trouvé de site internet pour ${dom}, alors que vos clients (particuliers, cavistes, restaurateurs) vous cherchent d'abord sur Google.`
        : `Je me suis rendu sur le site de ${dom} : il ne répond plus actuellement, ce qui vous coûte des visites et des ventes.`
    value = `Nous créons des sites dédiés aux vignerons de ${zone} (pack ${pk}, ${spaced(OFFERS.packs[pk].price)} €), avec vérification d'âge et conformité loi Évin.`
  } else if (status === 'obsolete' || status === 'vieillissant') {
    const issues = (audit?.issues || []).slice(0, 2)
    subject = `${dom} : quelques constats sur votre site`
    hook = `J'ai regardé le site de ${dom} et relevé quelques points qui freinent votre visibilité : ${
      issues.length ? issues.map((i) => i.charAt(0).toLowerCase() + i.slice(1)).join(' ; ') : 'le design et la version mobile'
    }.`
    value = `Nous refondons ce type de site pour des domaines de ${zone} (pack ${pk} à partir de ${spaced(OFFERS.packs[pk].price)} € HT) en conservant votre domaine et vos contenus.`
  } else if (status === 'inconnu') {
    subject = `${dom} : un diagnostic gratuit de votre présence en ligne`
    hook = `Je travaille avec des domaines viticoles de ${zone} et je me permets de vous contacter pour vous proposer un diagnostic gratuit de la visibilité de ${dom} sur internet (site, Google, réseaux sociaux).`
    value = 'Nous proposons des sites (à partir de 1 990 € HT) et un accompagnement mensuel (à partir de 150 €/mois), avec 10 points de contrôle loi Évin avant chaque publication.'
  } else {
    subject = `${dom} : développer vos ventes directes`
    hook = 'Votre site est en ligne, mais la régularité de la communication (articles, Instagram, Google) fait souvent la différence en vente directe.'
    value = `Notre accompagnement ${sc.abo} (${OFFERS.abos[sc.abo].price} €/mois) prend en charge contenus, réseaux et référencement, avec 10 points de contrôle loi Évin avant chaque publication.`
  }
  let extra = ''
  if (P.successor) extra = '\n\nJe sais que les domaines vivent souvent un moment charnière lors d\'une transmission : c\'est justement le bon moment pour poser une image claire.'
  else if ((P.nb_open || 0) >= 2) extra = '\n\nAvec plusieurs sites d\'exploitation, une présence en ligne structurée aide à porter votre développement.'
  const body =
    `${hello}\n\n${hook}\n\n${value} Nous travaillons exclusivement avec le secteur viticole (100 % de nos clients), ` +
    `domaine, hébergement et comptes restent à votre nom.${extra}\n\n` +
    `Seriez-vous ouvert à un audit gratuit de 45 minutes ? Vous repartez avec un diagnostic, que nous travaillions ensemble ou non.${
      settings.calendar ? `\nPour choisir un créneau : ${settings.calendar}` : ''
    }\n\nBien cordialement,\n${me}\n${settings.company} — ${settings.site}${settings.phone ? ` — ${settings.phone}` : ''}\n\n` +
    'Si ce message ne vous concerne pas, répondez « stop » et je ne vous écrirai plus.'
  const call =
    `Bonjour, ${me} de ${settings.company}. Je travaille uniquement avec des vignerons de ${zone}. ${hook} Auriez-vous 2 minutes ? ` +
    "→ Proposer l'audit gratuit de 45 min. Objection « j'ai déjà quelqu'un » : « Parfait, je peux regarder gratuitement ce qui pourrait être amélioré, sans engagement. »"
  return { subject, body, call, pitch: sc.pitch }
}

export { COOP_CODES }
