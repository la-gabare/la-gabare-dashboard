-- Prospects préparés par Harness Maxxing et poussés vers l'admin (route /api/export/prospect).
-- À exécuter une fois dans Supabase > SQL Editor, AVANT de publier le code qui en dépend.
-- Aucune donnée personnelle du dirigeant : nom commercial, SIREN, commune, état du site, brouillon de message.

create table if not exists prospects_hm (
  id bigint generated always as identity primary key,
  slug text not null unique,                  -- nom du dossier dans Harness Maxxing (topics/prospects/<slug>)
  nom text not null,
  appellation text,
  siren text,
  commune text,
  site_etat text,                             -- aucun | obsolete | vieillissant | moderne | inconnu
  stade text not null default 'prospect'
    check (stade in ('prospect', 'pret', 'contacte', 'repondu', 'lead', 'client', 'abandonne')),
  resume text,
  brouillon_email text,                       -- brouillon : rien n'est envoyé sans l'accord de Louis
  dossier text,                               -- chemin du dossier dans Harness Maxxing
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospects_hm_stade_idx on prospects_hm (stade, updated_at desc);

alter table prospects_hm enable row level security;

-- Depuis le 30/10/2026, Supabase n'expose plus les nouvelles tables : GRANT explicite (accès serveur uniquement, clé service)
GRANT ALL ON TABLE prospects_hm TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
