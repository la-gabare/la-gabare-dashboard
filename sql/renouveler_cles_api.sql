-- Remplace les clés API exposées (clients 15, 16, 17) par des clés aléatoires.
-- Aucune clé n'est affichée dans le résultat. À exécuter dans Supabase > SQL Editor.
update clients
   set api_key = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
 where id in (15, 16, 17);

select id || ' / ' || nom_domaine || ' / nouvelle clé : ' || length(api_key) || ' caractères' as resultat
  from clients where id in (15, 16, 17) order by id;
