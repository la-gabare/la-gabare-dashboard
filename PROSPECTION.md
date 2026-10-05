# Module Prospection

Page `/prospection` de l'admin : repère, qualifie et suit les vignerons de la Loire à démarcher.

## Mise en service (une seule fois)

1. **Créer les tables** : copier le contenu de `sql/create_prospection.sql` dans l'éditeur SQL de Supabase et l'exécuter.
2. **Protéger le module** : dans Vercel → Settings → Environment Variables, ajouter
   - `PROSPECTION_PASSWORD` : le mot de passe (obligatoire : sans lui, le module reste verrouillé en production)
   - `PROSPECTION_USER` : l'identifiant (facultatif, `admin` par défaut)

   Le navigateur demandera ces identifiants à l'ouverture de `/prospection`.
3. **Déployer**, puis ouvrir `/prospection` → onglet « Import & audit » : importer, détecter les sites, auditer.

## Fonctionnement
- **Import** : API publique SIRENE (data.gouv.fr), département par département, par lots.
- **Détection / audit** : traités par lots de 4 fiches depuis le navigateur (les fonctions Vercel ont une durée limitée à 60 s) : ne pas fermer la page pendant un lot.
- **Scoring** (`lib/prospection/scoring.ts`) : score /100, priorité A/B/C, pack et abonnement recommandés. Méthode détaillée dans l'onglet « Méthode & réglages ».
- **Réglages** : prénom/entreprise de l'expéditeur, clé Serper.dev facultative (Google Places : site, note, avis).

## Sécurité
- Toutes les routes `/api/prospection/*` et la page sont derrière `middleware.ts` (authentification Basic).
- Les requêtes sortantes vers les sites des prospects passent par `lib/prospection/net.ts` : HTTP(S) uniquement, hôtes publics uniquement (refus de localhost, réseaux privés et métadonnées cloud, y compris après redirection).
- Les tables ont la RLS activée sans policy : seules les routes serveur (clé service) y accèdent.

## Fichiers
| | |
|---|---|
| `app/prospection/page.tsx` + `components/prospection/*` | interface |
| `app/api/prospection/*` | routes API |
| `lib/prospection/*` | scoring, SIRENE, audit, détection, accès base |
| `middleware.ts` | protection par mot de passe |
| `sql/create_prospection.sql` | tables |
