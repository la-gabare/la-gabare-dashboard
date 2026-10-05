# Vérificateur de sites (gratuit)

Cherche **sur Bing**, avec un vrai navigateur Edge/Chrome sur votre PC et à un rythme humain, si chaque domaine viticole a un site web.
Chaque site candidat est vérifié (commune, code postal, nom du domaine sur la page), puis enregistré et audité dans l'admin.

## Lancer
Double-clic sur `lancer-verification.bat` (ou `lancer-verification.bat 37,49` pour plusieurs départements).
Le mot de passe du module Prospection est demandé au démarrage. Une fenêtre Edge s'ouvre : laissez-la travailler (≈ 20 s par domaine).

## Ce que ça fait
| Résultat | Effet dans l'admin |
|---|---|
| Site trouvé et vérifié | URL enregistrée + audit complet |
| Site probable (nom dans l'adresse, pas de commune) | Note « à vérifier » sur la fiche |
| Aucun site après 2 recherches | « Sans site (vérifié par recherche) » |
| Recherche inexploitable | Rien (sera retenté au prochain lancement) |

Le rapport complet est dans `rapport-verification.csv`. La reprise est automatique (`verificateur-etat.json`).

## Limites
- Aucune méthode n'est sûre à 100 % : un site peu référencé peut échapper à Bing. Comptez environ 90 % de fiabilité.
- Si Bing affiche une vérification (CAPTCHA), l'outil s'arrête sans la contourner : relancez plus tard.
- Usage modéré (quelques centaines de recherches par jour) pour respecter le service.
