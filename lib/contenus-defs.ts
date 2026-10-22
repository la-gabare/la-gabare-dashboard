// Définitions partagées (serveur et écrans de l'admin) — pas de dépendance serveur ici
// Contenus à fournir par le vigneron pour la création de son site, selon le pack.
// mode : « texte » = il répond directement dans son espace ; « galerie » = photos déposées dans la Galerie photo ;
//        « mail » = fichier ou accès à nous envoyer par e-mail (il coche quand c'est fait).
export interface ContenuDef { cle: string; libelle: string; aide: string; mode: 'texte' | 'galerie' | 'mail'; packs?: string[] }

export const CONTENUS: ContenuDef[] = [
  { cle: 'logo', libelle: 'Votre logo', aide: "Fichier d'origine si possible (PDF, SVG ou PNG haute définition), à envoyer par e-mail.", mode: 'mail' },
  { cle: 'photos', libelle: 'Photos du domaine', aide: "Vignes, chai, caveau, équipe — même prises au téléphone, nous trions. Déposez-les dans l'onglet « Galerie photo ».", mode: 'galerie' },
  { cle: 'cuvees', libelle: 'Vos cuvées', aide: 'Nom, millésime, cépages, prix public — et les fiches techniques si vous les avez.', mode: 'texte' },
  { cle: 'histoire', libelle: 'Votre histoire', aide: "Quelques lignes : l'origine du domaine, votre façon de travailler, ce qui vous distingue. Nous rédigeons les textes à partir de là.", mode: 'texte' },
  { cle: 'nom_domaine', libelle: 'Nom de domaine du site', aide: "L'adresse souhaitée (ex. domaine-des-coteaux.fr) ou les accès à celle que vous possédez déjà.", mode: 'texte' },
  { cle: 'legal', libelle: 'Informations légales', aide: "Raison sociale, adresse, SIRET, et numéro d'entrepositaire agréé si vous vendez en ligne.", mode: 'texte' },
  { cle: 'tarifs', libelle: 'Tarifs et livraison', aide: 'Prix particuliers et professionnels, frais de port, conditions de retrait au caveau.', mode: 'texte', packs: ['pro', 'premium'] },
  { cle: 'visites', libelle: 'Visites et dégustations', aide: "Vos créneaux, la durée, le prix et le montant d'acompte souhaité pour les réservations.", mode: 'texte', packs: ['premium'] },
]

export type EtatContenu = { statut: 'fourni' | 'valide'; texte?: string; fourni_at?: string; valide_at?: string }

export function contenusDuPack(pack: string | null | undefined) {
  const p = String(pack || '').toLowerCase()
  return CONTENUS.filter((c) => !c.packs || c.packs.includes(p))
}

// Liste prête à afficher : définition + état enregistré
export function listeContenus(client: { pack_site?: string | null; contenus?: Record<string, EtatContenu> | null }) {
  const etats = client.contenus || {}
  return contenusDuPack(client.pack_site).map((d) => ({ ...d, etat: etats[d.cle] || null }))
}

export function manquants(client: { pack_site?: string | null; contenus?: Record<string, EtatContenu> | null }) {
  return listeContenus(client).filter((c) => !c.etat)
}

