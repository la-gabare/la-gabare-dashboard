-- ════════════════════════════════════════════════════════════════════
-- Nettoyage des données de test — La Gabare
-- À exécuter dans Supabase > SQL Editor, EN DEUX TEMPS.
-- ════════════════════════════════════════════════════════════════════

-- ── ÉTAPE 1 : REGARDER (ne supprime rien) ───────────────────────────
-- Exécute uniquement ce bloc et vérifie la liste avant de passer à l'étape 2.
select 'client'  as quoi, id::text, nom_domaine as libelle, coalesce(domaine, '-') as detail from clients
union all
select 'lead', id::text, coalesce(nom, '-'), coalesce(email, '-') from leads
union all
select 'brief', id::text, coalesce(nom_domaine, '-'), coalesce(email, '-') from formulaire_complet
union all
select 'cahier des charges', id::text, coalesce(nom_domaine, '-'), coalesce(email, '-') from cahier_des_charges
union all
select 'produits du client ' || client_id, count(*)::text, '', '' from produits group by client_id
union all
select 'commandes du client ' || client_id, count(*)::text, '', '' from commandes group by client_id
order by 1, 2;


-- ── ÉTAPE 2 : SUPPRIMER ─────────────────────────────────────────────
-- Retire les « -- » devant les lignes que tu veux exécuter, puis lance UNIQUEMENT ce bloc.
-- Tout est dans une transaction : en cas d'erreur, rien n'est supprimé.

-- begin;

-- 2a. Démo de la boutique (client 17) : supprime aussi automatiquement
--     ses cuvées, commandes, professionnels et demandes pros (ON DELETE CASCADE).
-- delete from clients where id = 17 and domaine = 'demo.la-gabare.fr';

-- 2b. Lead de test « Louis Démo » (n° 22) et son brief (n° 7)
-- delete from formulaire_complet where id = 7 and email = 'wine.louis.bruzailles@gmail.com';
-- delete from leads where id = 22 and email = 'wine.louis.bruzailles@gmail.com';

-- 2c. FACULTATIF — autres données de test, si l'étape 1 confirme que ce sont des tests :
-- delete from leads where id = 19;                -- « Louis BRUZAILLES »
-- delete from clients where id = 16;              -- « Domaine test »
-- delete from clients where id = 15;              -- « Domaine des Rivières » (site de test supprimé d'Hostinger)

-- commit;

-- ── ENSUITE, À LA MAIN ──────────────────────────────────────────────
-- • Authentication › Users : supprimer louisbruz50+demo@gmail.com
-- • Ne PAS toucher aux tables vides (posts, newsletters, avis_google…) : elles servent aux fonctions de l'admin.
-- • Ne PAS toucher à « prospects » (1 206 lignes) ni « prospect_activities » : c'est ta base de prospection.
