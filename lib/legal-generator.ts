export interface ClientInfo {
  nom_domaine: string
  email_contact: string
  region: string
  appellation: string
  site_url?: string
}

export function generateMentionsLegales(client: ClientInfo): string {
  const date = new Date().toLocaleDateString('fr-FR')
  const domaine = client.site_url || `www.${client.nom_domaine.toLowerCase().replace(/\s+/g, '-')}.fr`

  return `# MENTIONS LÉGALES

En vigueur au ${date}

## 1. Éditeur du site

**${client.nom_domaine}**
Région: ${client.region}
Appellation: ${client.appellation}
Email: ${client.email_contact}

## 2. Hébergeur

Le site est hébergé par Hostinger.
Siège social: Hostinger International Ltd.
Site: www.hostinger.com

## 3. Propriété intellectuelle

L'ensemble des éléments constituant le site (textes, images, vidéos, logos, marques) sont la propriété exclusive de ${client.nom_domaine} ou de ses partenaires. Toute reproduction, représentation, modification, publication, adaptation de tout ou partie du site, par quelque procédé que ce soit, est interdite sans l'autorisation préalable écrite du propriétaire.

## 4. Responsabilité

${client.nom_domaine} s'efforce de fournir sur ce site des informations aussi précises que possible. Cependant, il ne pourra être tenu responsable des omissions, des inexactitudes et des carences dans la mise à jour, qu'elles soient de son fait ou de celui des tiers partenaires qui lui fournissent ces informations.

## 5. Limitation de responsabilité

Les informations contenues sur ce site sont destinées à usage personnel et non commercial. ${client.nom_domaine} ne pourra être tenu responsable de tout dommage indirect, particulier ou consécutif qui pourrait résulter de l'accès ou de l'utilisation du site.

## 6. Gestion des données personnelles

Conformément au Règlement Général sur la Protection des Données (RGPD), toute collecte de données personnelles est effectuée conformément à notre politique de confidentialité.

## 7. Droit applicable

Le présent site est régi par la loi française. Tout litige sera soumis à la juridiction compétente.

---

Dernière mise à jour: ${date}`
}

export function generateCGV(client: ClientInfo): string {
  const date = new Date().toLocaleDateString('fr-FR')

  return `# CONDITIONS GÉNÉRALES DE VENTE

En vigueur au ${date}

## 1. Objet

Les présentes conditions générales de vente s'appliquent à toute vente de produits viticoles du domaine ${client.nom_domaine} effectuée via le site internet.

## 2. Produits et prix

Les produits proposés à la vente sont les vins et accessoires viticoles du domaine ${client.nom_domaine}. Les prix affichés incluent les taxes applicables. ${client.nom_domaine} se réserve le droit de modifier les prix à tout moment, avec effet immédiat.

## 3. Commande et acceptation

La passation de commande sur le site constitue une offre d'achat. La commande ne sera considérée comme acceptée qu'après confirmation par ${client.nom_domaine}. Tout achat est limité aux stocks disponibles.

## 4. Validation et paiement

Le paiement s'effectue selon les modalités proposées au moment de la commande. Les moyens de paiement acceptés incluent les cartes bancaires et autres solutions de paiement disponibles. Le client est responsable de toute fraude liée à son moyen de paiement.

## 5. Livraison

- Les délais de livraison sont estimatifs et non contractuels.
- Les frais de port sont calculés automatiquement selon la destination.
- Conformément à la loi Évin, la livraison aux mineurs est interdite.
- Le risque est transféré au client lors de la réception du colis.

## 6. Rétractation

Conformément au droit français et européen, le client dispose d'un délai de 14 jours à compter de la réception de sa commande pour se rétracter, selon les conditions légales applicables.

## 7. Conformité - Loi Évin

L'accès à la vente de produits alcoolisés est réservé aux personnes majeures (18 ans minimum). ${client.nom_domaine} se réserve le droit de refuser une commande si elle semble destinée à un mineur.

## 8. Responsabilité

${client.nom_domaine} décline toute responsabilité pour:
- Les dommages dus au transport
- Les bris de bouteilles
- Les problèmes de conservation liés au stockage du client

## 9. Propriété intellectuelle

Tous les éléments du site (textes, images, marques) sont la propriété de ${client.nom_domaine}. Toute reproduction est interdite sans autorisation.

## 10. Modification des CGV

${client.nom_domaine} se réserve le droit de modifier ces CGV à tout moment. Les modifications entrent en vigueur dès leur publication sur le site.

## 11. Droit applicable

Les présentes CGV sont régies par le droit français. Tout litige sera soumis à la juridiction compétente.

---

Dernière mise à jour: ${date}`
}

export function generatePolitiqueCookies(client: ClientInfo): string {
  const date = new Date().toLocaleDateString('fr-FR')

  return `# POLITIQUE DE COOKIES

En vigueur au ${date}

## 1. Qu'est-ce qu'un cookie?

Un cookie est un fichier texte stocké sur votre appareil (ordinateur, tablette, téléphone) lors de votre visite sur notre site. Les cookies permettent de reconnaître votre navigateur et de mémoriser vos préférences.

## 2. Types de cookies utilisés

### Cookies essentiels (obligatoires)
- Cookies de session: Permettent de gérer votre panier et vos préférences
- Cookies d'authentification: Permettent de vous identifier
- Cookies de sécurité: Protègent contre les fraudes

### Cookies de performance
- Google Analytics: Analyse du comportement des utilisateurs
- Statistiques: Mesure de la fréquentation du site

### Cookies de marketing
- Retargeting: Publicités personnalisées
- Réseaux sociaux: Partage et interactions avec les réseaux

## 3. Consentement aux cookies

Lors de votre première visite, vous recevez un consentement cookie. Vous pouvez:
- Accepter tous les cookies
- Refuser les cookies non essentiels
- Personnaliser vos préférences

Les cookies essentiels sont obligatoires pour le fonctionnement du site.

## 4. Comment gérer vos cookies?

### Via les paramètres du site
Vous pouvez modifier vos préférences de cookies à tout moment via notre barre de consentement.

### Via votre navigateur
- Chrome: Paramètres > Confidentialité et sécurité > Cookies
- Firefox: Options > Confidentialité > Cookies
- Safari: Préférences > Confidentialité > Cookies
- Edge: Paramètres > Confidentialité > Cookies

## 5. Durée de conservation

- Cookies de session: Supprimés à la fermeture du navigateur
- Cookies persistants: Conservés jusqu'à 12 mois
- Google Analytics: Conservés 26 mois

## 6. Tiers responsables des cookies

Les cookies suivants sont gérés par des tiers:
- **Google Analytics**: Propriété de Google LLC
- **Réseaux sociaux**: Facebook, Instagram, LinkedIn
- **Fournisseurs de paiement**: Stripe, PayPal

Consultez leur politique de confidentialité respective.

## 7. Données collectées

Les cookies peuvent collecter:
- Votre adresse IP
- Votre type de navigateur
- Votre historique de navigation
- Vos interactions avec le site
- Vos données commerciales

## 8. Sécurité des données

${client.nom_domaine} s'engage à sécuriser les données collectées via cookies. Elles ne sont jamais vendues à des tiers.

## 9. Modification de cette politique

${client.nom_domaine} peut modifier cette politique à tout moment. Les modifications sont publiées sur cette page.

## 10. Contact

Pour toute question concernant les cookies:
Email: ${client.email_contact}

---

Dernière mise à jour: ${date}`
}

export function generatePolitiqueConfidentialite(client: ClientInfo): string {
  const date = new Date().toLocaleDateString('fr-FR')

  return `# POLITIQUE DE CONFIDENTIALITÉ

En vigueur au ${date}

## 1. Responsable du traitement

**${client.nom_domaine}**
Email: ${client.email_contact}
Région: ${client.region}

## 2. Données collectées

Lors de votre utilisation du site, nous collectons:
- Votre nom, prénom, adresse email
- Votre adresse postale (pour les livraisons)
- Votre numéro de téléphone
- Votre adresse IP
- Votre historique de navigation
- Vos données de paiement (traitées sécurisées)

## 3. Base légale du traitement

Le traitement de vos données repose sur:
- Votre consentement explicite
- L'exécution d'un contrat (commande)
- Le respect d'une obligation légale
- Les intérêts légitimes du domaine

## 4. Finalités du traitement

Vos données sont utilisées pour:
- Traiter vos commandes et livraisons
- Communiquer avec vous
- Prévenir les fraudes
- Améliorer nos services
- Respecter les obligations légales
- Envoyer des communications marketing (si consentement)

## 5. Durée de conservation

- Données de commande: 3 ans après la commande
- Données de paiement: Durée légale imposée
- Données marketing: Jusqu'à révocation du consentement
- Données de cookie: Selon la politique de cookies

## 6. Partage des données

Vos données peuvent être partagées avec:
- Nos partenaires logistiques (livraison)
- Nos fournisseurs de paiement
- Les autorités publiques (si obligation légale)

Les données ne sont jamais vendues à des tiers.

## 7. Sécurité

${client.nom_domaine} met en place des mesures de sécurité pour protéger vos données:
- Chiffrement SSL/TLS
- Accès sécurisé limité aux employés autorisés
- Pare-feu et systèmes de détection

## 8. Vos droits RGPD

Vous disposez des droits suivants:
- **Droit d'accès**: Consulter vos données
- **Droit de rectification**: Corriger vos données
- **Droit à l'oubli**: Demander suppression
- **Droit à la portabilité**: Récupérer vos données
- **Droit d'opposition**: Refuser le traitement
- **Droit à la limitation**: Limiter le traitement

Pour exercer vos droits: ${client.email_contact}

## 9. Délai de réponse

${client.nom_domaine} répond à toute demande dans un délai de 30 jours.

## 10. Transferts internationaux

Les données sont stockées en Europe. Aucun transfert vers pays tiers sans sécurité appropriée.

## 11. Modifications de cette politique

${client.nom_domaine} peut modifier cette politique à tout moment. Les modifications sont publiées sur cette page.

## 12. Autorité de contrôle

Vous pouvez contacter la CNIL en cas de problème:
www.cnil.fr

---

Dernière mise à jour: ${date}`
}

export function generateCGU(client: ClientInfo): string {
  const date = new Date().toLocaleDateString('fr-FR')

  return `# CONDITIONS GÉNÉRALES D'UTILISATION

En vigueur au ${date}

## 1. Acceptation des conditions

L'accès et l'utilisation du site ${client.site_url || client.nom_domaine} impliquent votre acceptation pleine et entière des présentes conditions générales d'utilisation.

## 2. Accès au site

${client.nom_domaine} s'efforce de maintenir le site accessible 24h/24, 7j/7. Cependant, nous nous réservons le droit de suspendre ou d'interrompre l'accès pour maintenance ou raisons techniques.

## 3. Restrictions d'utilisation

Vous vous engagez à ne pas:
- Modifier ou copier le contenu du site
- Utiliser des outils automatiques (bots, scrapers)
- Tenter d'accéder à des zones non autorisées
- Diffuser du contenu offensant ou illégal
- Harceler ou menacer d'autres utilisateurs
- Violer la loi ou les droits d'autrui

## 4. Contenu utilisateur

Si vous publiez du contenu (avis, commentaires), vous garantissez:
- Que vous en êtes l'auteur
- Que vous respectez les droits d'autrui
- Que le contenu n'est pas illégal

${client.nom_domaine} peut supprimer tout contenu non conforme.

## 5. Disclaimers

- Le site est fourni "tel quel" sans garantie
- ${client.nom_domaine} n'est pas responsable des interruptions de service
- Les informations sont fournies à titre informatif

## 6. Liens externes

Le site contient des liens vers des sites tiers. ${client.nom_domaine} n'est pas responsable du contenu de ces sites.

## 7. Limitation de responsabilité

${client.nom_domaine} n'est pas responsable des:
- Dommages indirects ou consécutifs
- Pertes de données
- Interruptions de service
- Erreurs ou omissions

## 8. Résiliation

${client.nom_domaine} peut résilier votre accès en cas de violation des CGU.

## 9. Loi applicable

Les présentes CGU sont régies par la loi française.

## 10. Contact

Pour toute question: ${client.email_contact}

---

Dernière mise à jour: ${date}`
}
