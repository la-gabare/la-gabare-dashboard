-- Lien de la maquette du site du prospect (prospection « push »), déposé par Harness Maxxing.
-- À exécuter une fois dans Supabase > SQL Editor, AVANT de publier le code qui en dépend.
alter table prospects_hm add column if not exists maquette_url text;
