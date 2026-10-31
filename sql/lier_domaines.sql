-- Fiche unique par domaine : relie leads et clients au prospect (prospects_hm) et ajoute la frise « Historique ».
-- À exécuter une fois dans Supabase > SQL Editor, APRÈS sql/create_prospects_hm.sql (déjà fait), AVANT de publier le code qui en dépend.
-- Ajouts uniquement : aucune donnée existante n'est modifiée ni supprimée.

alter table leads
  add column if not exists prospect_id bigint references prospects_hm(id) on delete set null;

alter table clients
  add column if not exists prospect_id bigint references prospects_hm(id) on delete set null;

create index if not exists leads_prospect_idx on leads (prospect_id);
create index if not exists clients_prospect_idx on clients (prospect_id);

-- Frise datée d'un domaine : dépôt du prospect, mail envoyé, réponse, devis, paiement...
create table if not exists evenements (
  id bigint generated always as identity primary key,
  prospect_id bigint not null references prospects_hm(id) on delete cascade,
  type text not null,                         -- prospect | mail | reponse | lead | devis | paiement | note
  titre text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists evenements_prospect_idx on evenements (prospect_id, created_at desc);

alter table evenements enable row level security;

-- Depuis le 30/10/2026, Supabase n'expose plus les nouvelles tables : GRANT explicite (accès serveur uniquement, clé service)
GRANT ALL ON TABLE evenements TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
