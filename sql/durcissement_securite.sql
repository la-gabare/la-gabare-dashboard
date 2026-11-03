-- Durcissement sécurité Supabase (27/10/2026) — à lancer dans Supabase › SQL Editor.
-- Ne supprime aucune donnée. Chaque bloc peut être relancé sans risque.
-- Source : conseils de sécurité/performance de Supabase (get_advisors).

-- 1. Fonction rls_auto_enable() : plus appelable par l'API (anon / connectés).
--    C'est un déclencheur interne ; il continue de fonctionner.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- 2. Tables utilisées uniquement par le serveur (clé service) : retirer les droits anon / authenticated.
--    Elles n'ont aucune policy, donc ces rôles n'y accédaient déjà pas ; on retire aussi le droit lui-même.
--    NON touchées (ont des policies) : leads, audits_gratuits, formulaire_complet, cahier_des_charges.
REVOKE ALL ON TABLE
  public.articles, public.articles_publications, public.avis_google,
  public.client_google_accounts, public.client_social_accounts, public.clients,
  public.commandes, public.devis, public.echeances, public.erreurs,
  public.mail_hebdo_requests, public.newsletter_abonnes, public.newsletters,
  public.photos_galerie, public.plan_editorial, public.plans_generation,
  public.posts, public.pro_demandes, public.produits, public.pros,
  public.prospect_activities, public.prospection_settings, public.prospects,
  public.publications, public.sites_generes, public.taches
FROM anon, authenticated;
GRANT ALL ON TABLE
  public.articles, public.articles_publications, public.avis_google,
  public.client_google_accounts, public.client_social_accounts, public.clients,
  public.commandes, public.devis, public.echeances, public.erreurs,
  public.mail_hebdo_requests, public.newsletter_abonnes, public.newsletters,
  public.photos_galerie, public.plan_editorial, public.plans_generation,
  public.posts, public.pro_demandes, public.produits, public.pros,
  public.prospect_activities, public.prospection_settings, public.prospects,
  public.publications, public.sites_generes, public.taches
TO service_role;

-- 3. Fonctions : fixer le search_path (bonne pratique). Tester ensuite une commande de boutique en mode test.
ALTER FUNCTION public.boutique_reserver(bigint, jsonb, integer, integer, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.boutique_liberer(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.boutique_payer(uuid, text, text, text, text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_status_on_html() SET search_path = public, pg_temp;

-- 4. Index sur les clés étrangères (performances quand il y aura plus de clients).
CREATE INDEX IF NOT EXISTS articles_publications_client_idx ON public.articles_publications (client_id);
CREATE INDEX IF NOT EXISTS avis_google_client_idx ON public.avis_google (client_id);
CREATE INDEX IF NOT EXISTS client_social_accounts_client_idx ON public.client_social_accounts (client_id);
CREATE INDEX IF NOT EXISTS clients_parrain_idx ON public.clients (parrain_id);
CREATE INDEX IF NOT EXISTS mail_hebdo_requests_client_idx ON public.mail_hebdo_requests (client_id);
CREATE INDEX IF NOT EXISTS newsletter_abonnes_client_idx ON public.newsletter_abonnes (client_id);
CREATE INDEX IF NOT EXISTS photos_galerie_client_idx ON public.photos_galerie (client_id);
CREATE INDEX IF NOT EXISTS plans_generation_client_idx ON public.plans_generation (client_id);
CREATE INDEX IF NOT EXISTS pro_demandes_pro_idx ON public.pro_demandes (pro_id);
CREATE INDEX IF NOT EXISTS sites_generes_client_idx ON public.sites_generes (client_id);
CREATE INDEX IF NOT EXISTS taches_client_idx ON public.taches (client_id);

-- Restent à faire à la main dans le tableau de bord Supabase :
--  • Authentication › Password security : activer « Leaked password protection ».
