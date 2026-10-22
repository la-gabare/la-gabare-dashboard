-- Checklist des contenus à fournir par le vigneron (espace client) + relances
-- À exécuter une fois dans Supabase > SQL Editor.
alter table clients add column if not exists contenus jsonb not null default '{}'::jsonb;  -- { cle: { statut, texte, fourni_at, valide_at } }
alter table clients add column if not exists contenus_limite date;                          -- date souhaitée (J+14 après l'acompte)
alter table clients add column if not exists contenus_relances int not null default 0;
alter table clients add column if not exists contenus_derniere_relance_at timestamptz;
