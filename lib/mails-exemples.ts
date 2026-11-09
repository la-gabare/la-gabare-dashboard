// Un exemple de CHAQUE e-mail client/prospect avec de fausses données : sert à l'aperçu (scripts/apercu-mails.ts) et à la route d'essai
// (/api/test-mails-charte, envoi à l'agence seulement). N'envoie rien par lui-même.
import { paymentLinkEmail } from '@/lib/mail-paiement'
import { mailPriseDeContact } from '@/lib/leads/mails'
import { mailRelanceLead, mailFinOffert } from '@/lib/relances-auto'
import { mailRapport } from '@/lib/audit-ia'
import { mailDevis, mailAccueil, type Devis } from '@/lib/paiements/devis'
import { mailEcheance } from '@/lib/paiements/echeancier'
import { htmlMaquettePrete, htmlSiteEnLigne } from '@/lib/paiements/projet'
import { mailAccompagnementOffert } from '@/lib/paiements/accompagnement-offert'
import { mailContenusManquants } from '@/lib/contenus'
import { mailContenu, type Ligne } from '@/lib/mails-contenu-html'
import { mailBilanMensuel, htmlBilan, type Bilan } from '@/lib/rapport-mensuel'
import { mailOffre, OFFRES } from '@/lib/offres'
import { mailParrainage } from '@/lib/parrainage'
import { mailResiliationAnticipee, mailChangementFormule, mailDemandeResiliation } from '@/lib/mails-abonnement'
import { mailDemandeAccesDomaine, mailDemandePro } from '@/lib/pro/emails'
import { mailNouvelleCommandeDomaine } from '@/lib/boutique/emails'

const DOMAINE = 'Domaine Exemple'
const PRENOM = 'Camille'
export const CLIENT = 'camille@domaine-exemple.fr'
const fin = new Date('2027-02-09T12:00:00Z')

const devis: Devis = {
  id: 1, client_id: 1, numero: 'D-2026-012', lignes: [{ libelle: 'Pack Essentiel', montant_ht_cents: 199000 }], remise_pct: 0,
  total_ht_cents: 199000, tva_pct: 0, total_ttc_cents: 199000, formule: '3x', validite: '2026-12-09', statut: 'envoye',
  token: 'exemple', accepte_at: null, accepte_nom: null, created_at: '2026-11-09',
}
const bilan: Bilan = {
  articles: ['Après les vendanges : le chai se remplit', 'Le tuffeau, mémoire de nos caves'], posts: 6,
  postsParReseau: { instagram: 4, facebook: 2 }, avis: 3, noteMoyenne: 4.7, avisRepondus: 3, newsletters: 1, aVenir: { articles: 2, posts: 4 },
}
const lignes: Ligne[] = [
  { date: '2026-11-10', type: 'Article', titre: 'Après les vendanges : le chai se remplit', valide: true },
  { date: '2026-11-12', type: 'Publication', titre: 'Instagram photo (relaie « Après les vendanges »)' },
  { date: '2026-11-17', type: 'Article', titre: 'Le tuffeau, mémoire de nos caves' },
]
const ESPACE = 'https://la-gabare.fr/espace-client.html'
const clientOffre = { id: 1, nom_domaine: DOMAINE, email_contact: CLIENT, pack_site: 'essentiel', abonnement: 'village', statut: 'actif',
  mis_en_ligne_at: '2026-06-01', date_debut_abonnement: '2026-06-01', resiliation_demandee_at: null, offres_envoyees: null }
const commande = {
  numero: 42, nom: 'Jean Martin', email: 'jean.martin@example.com', telephone: '06 00 00 00 00',
  lignes: [{ produit_id: 1, nom: 'Cuvée des Galets', millesime: '2023', prix_cents: 1450, quantite: 6, bouteilles: 6 }],
  sous_total_cents: 8700, frais_port_cents: 1290, total_cents: 9990,
  livraison: { mode: 'livraison', adresse: { line1: '12 rue des Vignes', line2: null, postal_code: '37000', city: 'Tours' } },
}

// [sujet, html, expéditeur (pour la signature automatique), destinataire]
export type Mail = [string, string, string?]
export const mails: Mail[] = [
  [`Votre demande — ${DOMAINE}`, mailPriseDeContact({ nom: PRENOM, email: CLIENT, domaine: DOMAINE, pack_demande: 'Essentiel', lead_id: 123 })],
  [`Toujours intéressé par ${DOMAINE} ?`, mailRelanceLead({ id: '123', nom: PRENOM, domaine: DOMAINE })],
  [`Votre audit gratuit — ${DOMAINE}`, mailRapport({ id: 123, nom: PRENOM, email: CLIENT, domaine: DOMAINE }, {
    synthese: 'Votre site présente bien le domaine, mais il est difficile de trouver où acheter vos vins et la page n\'est pas adaptée au téléphone.',
    points_forts: ['De belles photos des vignes', 'Une histoire familiale bien racontée'],
    problemes: [{ titre: 'Pas de boutique', detail: 'Les visiteurs ne peuvent pas commander en ligne.' },
      { titre: 'Lecture difficile sur mobile', detail: 'Le texte déborde de l\'écran.' }, { titre: 'Site lent', detail: 'Les images sont très lourdes.' }],
    gains: [{ titre: 'Référencement local', detail: 'Apparaître sur « vin Touraine ».' }, { titre: 'Avis Google', detail: 'Les mettre en avant.' },
      { titre: 'Newsletter', detail: 'Garder le lien avec vos clients.' }],
    conformite: ['Ajouter la mention « L\'abus d\'alcool est dangereux pour la santé ».'],
    recommandation: 'Le Pack Pro, avec boutique, répond à vos trois priorités.',
  })],
  [`Votre devis ${devis.numero} — ${DOMAINE}`, mailDevis(devis, DOMAINE)],
  [`Rappel — votre devis ${devis.numero} · ${DOMAINE}`, mailDevis(devis, DOMAINE, 1)],
  [`Dernier rappel — votre devis ${devis.numero} · ${DOMAINE}`, mailDevis(devis, DOMAINE, 3)],
  [`Lien de paiement (site) — ${DOMAINE}`, paymentLinkEmail(DOMAINE, 1990, 'site', 'https://checkout.stripe.com/exemple')],
  [`Lien de paiement (abonnement) — ${DOMAINE}`, paymentLinkEmail(DOMAINE, 89, 'abonnement', 'https://checkout.stripe.com/exemple')],
  [`Acompte à la commande — ${DOMAINE}`, mailEcheance(DOMAINE, { libelle: 'Acompte à la commande', montant_cents: 79600, ordre: 1, token: 'exemple' })],
  [`Rappel — Mise en ligne — ${DOMAINE}`, mailEcheance(DOMAINE, { libelle: 'Mise en ligne', montant_cents: 59700, ordre: 3, token: 'exemple' }, true)],
  [`Bienvenue — lançons le site de ${DOMAINE}`, mailAccueil(DOMAINE, 'pro', '23 novembre 2026')],
  [`Votre site — il nous manque 2 éléments · ${DOMAINE}`, mailContenusManquants(DOMAINE, [
    { libelle: 'Logo', aide: 'fichier d\'origine si possible' }, { libelle: 'Photos du domaine', aide: 'même prises au téléphone' }])],
  [`Votre maquette est prête — ${DOMAINE}`, htmlMaquettePrete(DOMAINE, 'https://demo.la-gabare.fr/domaine-exemple')],
  [`Votre site est en ligne — ${DOMAINE}`, htmlSiteEnLigne(DOMAINE, 'https://domaine-exemple.fr')],
  [`Votre accompagnement Village offert démarre — ${DOMAINE}`, mailAccompagnementOffert({ nomDomaine: DOMAINE, moisOfferts: 3, nomInclus: 'Village', fin, prix: '89,00 €', nomFormule: 'Village', url: 'https://checkout.stripe.com/exemple' })],
  [`Vos mois offerts se terminent le … — ${DOMAINE}`, mailFinOffert(DOMAINE, 'Village', fin, 'j15', htmlBilan(bilan))],
  [`Votre accompagnement est en pause — ${DOMAINE}`, mailFinOffert(DOMAINE, 'Village', fin, 'fin')],
  [`Votre programme éditorial de novembre est prêt à valider · ${DOMAINE}`, mailContenu({ surtitre: 'Programme éditorial · novembre', titre: 'Votre programme du mois est prêt à valider',
    intro: `Voici les contenus prévus pour ${DOMAINE} en novembre.`, lignes, pied: 'Merci de relire chaque article et de le valider (ou de demander une modification) depuis votre espace client.', bouton: 'Relire et valider', lien: ESPACE })],
  [`Votre programme du mois · ${DOMAINE}`, mailContenu({ surtitre: 'Programme de publication · novembre', titre: 'Votre programme de novembre',
    intro: `Voici le calendrier de publication de ${DOMAINE}.`, lignes, pied: 'Rien à faire de votre côté : tout est publié aux dates indiquées. Les contenus restent modifiables depuis votre espace client.', bouton: 'Ouvrir mon espace client', lien: ESPACE })],
  [`Votre programme de la semaine · ${DOMAINE}`, mailContenu({ surtitre: 'Programme de la semaine', titre: 'Du 10 novembre 2026 au 16 novembre 2026',
    intro: `Voici ce qui est prévu cette semaine pour ${DOMAINE}.`, lignes: lignes.slice(0, 2), pied: 'Un changement à faire ? Répondez simplement à ce message.', bouton: 'Ouvrir mon espace client', lien: ESPACE })],
  [`Votre bilan de octobre 2026 — ${DOMAINE}`, mailBilanMensuel(DOMAINE, 'octobre 2026', bilan)],
  ...OFFRES.map((o): Mail => [o.sujet(clientOffre), mailOffre(o, clientOffre)]),
  ['Merci pour votre recommandation — 1 mois offert', mailParrainage('Château Voisin', true, '89,00 €')],
  [`Votre nouvelle formule Réserve — ${DOMAINE}`, mailChangementFormule(DOMAINE, 'Village', 'Réserve', '149,00 €', 'à partir du prélèvement du 1 décembre 2026')],
  [`Votre demande de résiliation — ${DOMAINE}`, mailDemandeResiliation(DOMAINE, 'Village', '9 novembre 2026', '9 février 2027')],
  [`Résiliation de votre abonnement — ${DOMAINE}`, mailResiliationAnticipee(DOMAINE)],
  ['Nouvelle commande n° 42 (au vigneron)', mailNouvelleCommandeDomaine(DOMAINE, commande), 'La Gabare — Boutique'],
  ['Demande d\'accès pro — Cave du Centre (au vigneron)', mailDemandeAccesDomaine(DOMAINE, { entreprise: 'Cave du Centre', activite: 'Caviste', ville: 'Tours', nom: 'Paul Durand', email: 'paul@cave.fr', siret: '123 456 789 00010', message: 'Nous aimerions référencer vos blancs.' }), 'La Gabare — Espace pro'],
  ['Demande de commande pro (au vigneron)', mailDemandePro(DOMAINE, { entreprise: 'Cave du Centre', nom: 'Paul Durand', email: 'paul@cave.fr' }, { type: 'commande', total_ht_cents: 52200, message: null, lignes: [{ quantite: 36, nom: 'Cuvée des Galets', millesime: '2023', prix_pro_cents: 1450 }] }), 'La Gabare — Espace pro'],
]

