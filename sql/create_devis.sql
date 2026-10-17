-- Devis en ligne : envoi, acceptation avec les CGV, puis échéancier et acompte automatiques
-- À exécuter une fois dans Supabase > SQL Editor.

create table if not exists devis (
  id bigint generated always as identity primary key,
  client_id bigint not null references clients(id) on delete cascade,
  numero text not null unique,                -- D-2026-001
  lignes jsonb not null,                      -- [{ "libelle": "Pack Pro", "detail": "...", "montant_ht_cents": 449000 }]
  remise_pct numeric not null default 0,      -- remise paiement comptant (formule 1x)
  total_ht_cents int not null,
  tva_pct numeric not null,                   -- 0 = franchise en base de TVA
  total_ttc_cents int not null,
  formule text not null check (formule in ('1x', '2x', '3x')),
  validite date not null,
  statut text not null default 'envoye' check (statut in ('envoye', 'accepte', 'refuse', 'annule')),
  token text not null unique,
  envoye_at timestamptz,
  accepte_at timestamptz,
  accepte_nom text,                           -- nom saisi par le client à l'acceptation
  accepte_ip text,
  created_at timestamptz not null default now()
);

create index if not exists devis_client_idx on devis (client_id, created_at desc);

alter table devis enable row level security;
-- Aucune policy : seules les routes serveur du dashboard (clé service) y accèdent.

-- Mail d'accueil (contenus à fournir) envoyé une seule fois, au premier paiement
alter table clients add column if not exists accueil_envoye_at timestamptz;
