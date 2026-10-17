-- Suivi du projet de site : maquette soumise / validée par le client, mise en ligne
-- À exécuter une fois dans Supabase > SQL Editor.
alter table clients add column if not exists maquette_url text;
alter table clients add column if not exists maquette_statut text
  check (maquette_statut in ('a_valider', 'corrections', 'validee'));
alter table clients add column if not exists maquette_commentaire text;
alter table clients add column if not exists maquette_soumise_at timestamptz;
alter table clients add column if not exists maquette_validee_at timestamptz;
alter table clients add column if not exists mis_en_ligne_at timestamptz;
