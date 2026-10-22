-- Parrainage entre vignerons — À exécuter une fois dans Supabase > SQL Editor.
alter table clients add column if not exists code_parrainage text unique;          -- code personnel du client (lien à partager)
alter table clients add column if not exists parrain_id bigint references clients(id) on delete set null;
alter table clients add column if not exists mois_offerts_bonus int not null default 0; -- mois d'accompagnement offerts en plus (filleul)
alter table clients add column if not exists parrainage_recompense_at timestamptz;    -- récompense du parrain déjà versée pour ce filleul
alter table leads add column if not exists parrain_code text;
