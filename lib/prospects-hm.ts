// Prospects de Harness Maxxing : validation de ce que l'agent pousse vers l'admin (aucune donnée personnelle).
export const STADES = ['prospect', 'pret', 'contacte', 'repondu', 'lead', 'client', 'abandonne'] as const
export type Stade = (typeof STADES)[number]

export type ProspectEntrant = {
  slug: string; nom: string; appellation?: string; siren?: string; commune?: string
  site_etat?: string; stade: Stade; resume?: string; fiche?: string; brouillon_email?: string; dossier?: string; maquette_url?: string
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
      resume: texte(b.resume, 3000), fiche: texte(b.fiche, 30000), brouillon_email: texte(b.brouillon_email, 8000), dossier: texte(b.dossier, 200), maquette_url: texte(b.maquette_url, 300),
    },
  }
}

// Prospection « push » (nous cherchons) : recherche -> maquette -> contact -> accord -> client.
// Les valeurs de la base ne changent pas ; « repondu » (ancien) reste valide mais n'est plus proposé.
export const ETAPES_PUSH: Stade[] = ['prospect', 'pret', 'contacte', 'lead', 'client']
export const LABELS_STADE: Record<Stade, string> = {
  prospect: 'Recherche', pret: 'Maquette prête', contacte: 'Contacté', repondu: 'A répondu',
  lead: 'A accepté', client: 'Client', abandonne: 'Abandonné',
}
// Stades où l'on peut créer le client (devis) depuis la fiche, comme pour un lead du formulaire
export const peutDevenirClient = (stade: Stade) => ['pret', 'contacte', 'repondu', 'lead'].includes(stade)

// Ce qu'il y a à faire ensuite, selon le stade (rien n'est jamais envoyé automatiquement).
export function prochaineAction(stade: Stade): string | null {
  switch (stade) {
    case 'prospect': return 'Harness Maxxing recherche le domaine, prépare le dossier et la maquette du site.'
    case 'pret': return 'Regarder la maquette, relire le brouillon, contacter le vigneron vous-même, puis marquer « Contacté ».'
    case 'contacte': return 'Sans réponse après 7 jours : relancer, ou abandonner. S\'il accepte : « Client + devis ».'
    case 'repondu': return 'Répondre ; s\'il accepte : « Client + devis ».'
    case 'lead': return 'Il a accepté : cliquer sur « Client + devis » pour créer le client et envoyer le devis.'
    case 'client': return 'Devis, premier jet du site, 2e paiement, mise en ligne : tout se suit dans les onglets ci-dessous.'
    default: return null
  }
}

export const TYPES_EVENEMENT = ['prospect', 'mail', 'reponse', 'lead', 'devis', 'paiement', 'note'] as const
