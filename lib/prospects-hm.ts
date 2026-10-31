// Prospects de Harness Maxxing : validation de ce que l'agent pousse vers l'admin (aucune donnée personnelle).
export const STADES = ['prospect', 'pret', 'contacte', 'repondu', 'lead', 'client', 'abandonne'] as const
export type Stade = (typeof STADES)[number]

export type ProspectEntrant = {
  slug: string; nom: string; appellation?: string; siren?: string; commune?: string
  site_etat?: string; stade: Stade; resume?: string; brouillon_email?: string; dossier?: string
}

const texte = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined)

export function validerProspect(corps: unknown): { ok: true; prospect: ProspectEntrant } | { ok: false; erreur: string } {
  if (!corps || typeof corps !== 'object') return { ok: false, erreur: 'Corps invalide' }
  const b = corps as Record<string, unknown>
  const slug = texte(b.slug, 80)
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) return { ok: false, erreur: 'slug invalide (minuscules, chiffres, tirets)' }
  const nom = texte(b.nom, 120)
  if (!nom) return { ok: false, erreur: 'nom obligatoire' }
  const stade = (b.stade ?? 'prospect') as Stade
  if (!STADES.includes(stade)) return { ok: false, erreur: 'stade invalide' }
  const siren = texte(b.siren, 20)?.replace(/\s/g, '')
  if (siren && !/^\d{9}$/.test(siren)) return { ok: false, erreur: 'siren invalide (9 chiffres)' }
  return {
    ok: true,
    prospect: {
      slug, nom, stade, siren,
      appellation: texte(b.appellation, 120), commune: texte(b.commune, 80), site_etat: texte(b.site_etat, 30),
      resume: texte(b.resume, 3000), brouillon_email: texte(b.brouillon_email, 8000), dossier: texte(b.dossier, 200),
    },
  }
}

export const LABELS_STADE: Record<Stade, string> = {
  prospect: 'Prospect', pret: 'Prêt à valider', contacte: 'Contacté', repondu: 'A répondu',
  lead: 'Lead', client: 'Client', abandonne: 'Abandonné',
}

// Ce qu'il y a à faire ensuite, selon le stade (rien n'est jamais envoyé automatiquement).
export function prochaineAction(stade: Stade): string | null {
  switch (stade) {
    case 'prospect': return 'Faire préparer le dossier et le brouillon de message par l\'agent.'
    case 'pret': return 'Relire le brouillon, l\'envoyer vous-même, puis marquer « Contacté ».'
    case 'contacte': return 'Sans réponse après 7 jours : relancer, ou abandonner.'
    case 'repondu': return 'Répondre et proposer un rendez-vous.'
    case 'lead': return 'Envoyer le devis.'
    case 'client': return 'Suivre le projet et le contenu du mois.'
    default: return null
  }
}

export const TYPES_EVENEMENT = ['prospect', 'mail', 'reponse', 'lead', 'devis', 'paiement', 'note'] as const
