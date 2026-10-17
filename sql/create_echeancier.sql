-- Échéancier de paiement des sites (1, 2 ou 3 versements) + relances automatiques
-- À exécuter une fois dans Supabase > SQL Editor.

create table if not exists echeances (
  id bigint generated always as identity primary key,
  client_id bigint not null references clients(id) on delete cascade,
  ordre int not null,                         -- 1, 2, 3
  libelle text not null,                      -- « Acompte à la commande », « Validation de la maquette »…
  montant_cents int not null check (montant_cents > 0),
  statut text not null default 'a_venir'
    check (statut in ('a_venir', 'envoye', 'virement_en_attente', 'paye', 'annule')),
  token text not null unique,                 -- lien de paiement permanent /api/public/payer/<token>
  envoye_at timestamptz,
  relances int not null default 0,
  derniere_relance_at timestamptz,
  paye_at timestamptz,
  moyen text,                                 -- card, customer_balance (virement Stripe), manuel
  checkout_session_id text,
  created_at timestamptz not null default now()
);

create index if not exists echeances_client_idx on echeances (client_id, ordre);

alter table echeances enable row level security;
-- Aucune policy : seules les routes serveur du dashboard (clé service) y accèdent.
