# Checklist de lancement — La Gabare

À faire une fois les démarches administratives terminées (SIRET, compte bancaire pro).
Aujourd'hui : la boutique est en **mode test** ; les abonnements utilisent encore la clé **réelle** →
**ne générer aucun lien de paiement d'abonnement** avant le lancement.

## 1. Stripe — compte réel (≈ 30 min)
- [ ] Compléter le compte Stripe réel « La gabare » : SIRET, IBAN pro, identité du gérant.
- [ ] **Connect** (mode réel) : activer, choisir « Plateforme » → « Vos commerçants collectent directement les paiements »,
      comptes **Standard**, remplir le profil de plateforme, accepter les conditions.
- [ ] **Webhook abonnements** (mode réel, « Votre compte ») :
      `https://admin.la-gabare.fr/api/stripe-webhook` — événements `checkout.session.completed`,
      `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` (virements des sites).
- [ ] **Moyens de paiement** (Paramètres › Moyens de paiement) : activer **Virement bancaire** (paiement des sites)
      et **Prélèvement SEPA** (abonnements). Sans eux, les liens proposent la carte seule.
- [ ] **Webhook boutique** (mode réel, « Comptes connectés ») :
      `https://admin.la-gabare.fr/api/stripe-connect-webhook` — événements `checkout.session.completed`,
      `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `checkout.session.async_payment_failed`.

## 2. Vercel — variables (projet la-gabare-dashboard), puis Redeploy
| Variable | Valeur au lancement |
|---|---|
| `STRIPE_SECRET_KEY` | clé réelle `sk_live_…` (abonnements) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` du webhook **abonnements réel** |
| `STRIPE_BOUTIQUE_SECRET_KEY` | clé réelle `sk_live_…` (boutique) |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | `whsec_…` du webhook **boutique réel** |
| `AGENCE_RAISON_SOCIALE`, `AGENCE_ADRESSE`, `AGENCE_SIRET` | identité de l'entreprise, affichée sur les devis |
| `AGENCE_TVA_TAUX` | `20`, ou `0` en franchise de TVA (micro-entreprise : « TVA non applicable, art. 293 B du CGI ») |
| `CRON_SECRET` | longue phrase au hasard (relances automatiques des paiements, déjà utilisable avant le lancement) |

## 3. Nettoyer la démo (Supabase)
- [ ] Supprimer le client n° 17 « Domaine Moreau (démo) » (et ses cuvées / commandes).
- [ ] Supprimer l'utilisateur `louisbruz50+demo@gmail.com` (Authentication › Users).
- [ ] Supprimer le lead de test n° 22 « Louis Démo » et son brief n° 7.

## 4. Divers
- [ ] Désactiver le workflow n8n « Nouveau Lead » (remplacé par le dashboard).
- [ ] Vérifier la réception des notifications agence (nouveau lead, brief reçu).
- [ ] CGV de vente de vin pour chaque domaine (rétractation, livraison, âge) — lien dans « Ma boutique › Réglages ».
- [ ] Rappeler aux domaines leurs obligations douanières pour la vente à distance.

## 5. Pour chaque nouveau client Pack Pro
1. Installer le site depuis le Template Pro sur son domaine
   (`data-domain` dans `js/boutique.js`, retirer `data-demo`, mettre son `publish_token` dans `boutique-publish.php`).
2. Fiche client : `domaine`, `boutique_active = true`.
3. Pendant la formation : le vigneron clique « Connecter mon compte Stripe » et saisit **ses** informations.
4. Il ajoute ses cuvées et clique « Publier la boutique ».

## Tests restant à faire (mode test, avant le lancement)
- [ ] Paiement du site : sur une fiche client test, créer un échéancier 40 / 30 / 30, payer le 1er versement
      par carte `4242 4242 4242 4242` puis le 2e par virement (Stripe test : bouton « simuler un virement »).
- [ ] Boutique : terminer l'inscription Stripe du domaine de démo, achat avec la carte `4242 4242 4242 4242`,
      vérifier commande, stock, e-mails, expédition.
- [ ] Espace pro : demande d'accès depuis `professionnels.html`, validation dans Ma boutique › Professionnels,
      ouverture du lien reçu par e-mail, envoi d'une demande de commande et d'échantillons.
- [ ] Abonnements : passer `STRIPE_SECRET_KEY` sur la clé de test + `STRIPE_WEBHOOK_SECRET` sur le webhook
      de test « abonnements-la-gabare » (déjà créé), puis tester un lien de paiement.
