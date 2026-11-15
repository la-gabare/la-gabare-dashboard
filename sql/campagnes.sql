-- Campagne de prospection par e-mail (mail « Présentation de La Gabare ») : un destinataire par ligne, suivi des envois et des refus.
-- À exécuter une fois dans Supabase > SQL Editor, AVANT de publier le code qui en dépend.
-- Ce n'est PAS la newsletter : ces domaines ne sont pas abonnés. Aucune donnée personnelle de dirigeant : adresses professionnelles publiées par les domaines.

create table if not exists campagne_destinataires (
  id bigint generated always as identity primary key,
  campagne text not null default 'presentation',
  nom text not null,
  appellation text,
  commune text,
  site text,
  email text not null,
  telephone text,
  source text,
  indices text,
  statut text not null default 'a_contacter'
    check (statut in ('a_contacter', 'envoye', 'refus', 'erreur')),
  envoye_le timestamptz,
  erreur text,
  created_at timestamptz not null default now()
);

create unique index if not exists campagne_destinataires_email_idx on campagne_destinataires (campagne, lower(email));
create index if not exists campagne_destinataires_statut_idx on campagne_destinataires (statut, envoye_le);

alter table campagne_destinataires enable row level security;

GRANT ALL ON TABLE campagne_destinataires TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
