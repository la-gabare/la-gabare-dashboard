// Référentiels métier du module Prospection (offres reprises de la-gabare.fr)

export const OFFERS = {
  packs: {
    Essentiel: { price: 1990, desc: "5 pages, design adapté, vérification d'âge" },
    Pro: { price: 4490, desc: '10 pages, sur-mesure, boutique en ligne' },
    Premium: { price: 6990, desc: 'Illimité, réservation de visites, 2 langues' },
  },
  abos: {
    Village: { price: 150, desc: 'Présence & référencement' },
    Réserve: { price: 350, desc: 'Communication & visibilité' },
    'Grand Cru': { price: 550, desc: 'Croissance & œnotourisme' },
  },
} as const

export type PackName = keyof typeof OFFERS.packs
export type AboName = keyof typeof OFFERS.abos

export const ZONES: Record<string, string> = {
  '44': 'Muscadet', '49': 'Anjou-Saumur', '37': 'Touraine', '41': 'Touraine',
  '18': 'Centre-Loire', '36': 'Centre-Loire', '45': 'Centre-Loire', '58': 'Centre-Loire',
}

export const DEPT_NAMES: Record<string, string> = {
  '44': 'Loire-Atlantique', '49': 'Maine-et-Loire', '37': 'Indre-et-Loire', '41': 'Loir-et-Cher',
  '18': 'Cher', '36': 'Indre', '45': 'Loiret', '58': 'Nièvre',
  '72': 'Sarthe', '85': 'Vendée', '79': 'Deux-Sèvres',
}

export const STATUSES = ['Nouveau', 'À contacter', 'Contacté', 'RDV / Audit', 'Devis envoyé', 'Gagné', 'Perdu', 'Exclu'] as const

export const STATUS_PROBA: Record<string, number> = {
  Nouveau: 0.02, 'À contacter': 0.03, Contacté: 0.08, 'RDV / Audit': 0.25,
  'Devis envoyé': 0.5, Gagné: 1, Perdu: 0, Exclu: 0,
}

export const EFF_MID: Record<string, number> = {
  '00': 0, '01': 1.5, '02': 4, '03': 7.5, '11': 15, '12': 35, '21': 75, '22': 150,
  '31': 225, '32': 375, '41': 750, '42': 1500, '51': 3500, '52': 7500, '53': 10000,
}

export const EFF_LABEL: Record<string, string> = {
  NN: 'Non employeur', '00': '0 salarié', '01': '1-2', '02': '3-5', '03': '6-9', '11': '10-19',
  '12': '20-49', '21': '50-99', '22': '100-199', '31': '200-249', '32': '250-499',
}

export const EMPLOYER_CODES = '00,01,02,03,11,12,21,22,31,32,41,42,51,52,53'

export const LEGAL: Record<string, string> = {
  '1000': 'EI', '5498': 'EURL', '5499': 'SARL', '5410': 'SARL', '5710': 'SAS', '5720': 'SASU', '5599': 'SA',
  '5505': 'SA', '5510': 'SA', '6597': 'SCEA', '6598': 'EARL', '6533': 'GAEC', '6534': 'GFA',
  '6551': 'SCEA', '6599': 'Société civile', '6316': 'CUMA', '6317': 'Coopérative agricole',
  '6318': 'Union de coopératives', '6521': 'SCPI', '6540': 'SCI', '5307': 'SNC', '5306': 'SNC',
}

export const COOP_CODES = new Set(['6316', '6317', '6318', '6532'])

export const DEFAULT_SETTINGS: Record<string, string> = {
  sender_name: '', company: 'La Gabare', sender_email: 'louisbruz50@gmail.com',
  phone: '', site: 'https://la-gabare.fr', calendar: '', serper_key: '',
}

export const SITE_STATUSES = ['inconnu', 'aucun', 'hs', 'obsolete', 'vieillissant', 'moderne'] as const
