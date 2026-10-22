# Admin La Gabare (admin.la-gabare.fr)

**Contexte complet du projet : lire d'abord `C:\Users\louis\Desktop\Harness La Gabare\CLAUDE.md`**
(qui est La Gabare, offres, carte du système, règles à ne jamais enfreindre), puis le fichier de `1-contexte\` utile à la tâche
(`parcours-client.md` pour toute modification du parcours, `architecture.md` pour Stripe / Supabase / n8n / variables).
Ce harness est la source unique : le mettre à jour quand une décision change.

## Rappels essentiels pour ce dépôt
- Français partout (interface, mails, commits). Utilisateur non développeur : expliquer simplement.
- Avant tout commit : `rm -rf .next/types && npx tsc --noEmit` puis `npm test` (règles métier) — ne jamais committer si ça échoue (le garde-fou du harness refuse le commit).
- Changement de base → fichier `sql/*.sql` exécuté **par l'utilisateur**, et publication du code **après** si le code en dépend.
- Jamais de secret écrit, affiché ou collé ; jamais remplacer la clé Stripe `sk_live` sans accord (admin en mode test pour l'instant).
- Routes `app/api/**/route.ts` : seulement les méthodes HTTP et `dynamic` / `maxDuration` ; le reste dans `lib/`.
- `console.error` serveur = alerte e-mail (lib/alertes.ts) : pas de bruit.
- Commits sur `main`, poussés directement (Vercel déploie), terminés par la ligne Co-Authored-By.
