-- Propositions d'options envoyées automatiquement (une seule fois chacune) — À exécuter une fois dans Supabase > SQL Editor.
alter table clients add column if not exists offres_envoyees jsonb not null default '{}'::jsonb; -- { cle: date d'envoi }
alter table clients add column if not exists offres_desactivees boolean not null default false;   -- le client ne veut plus de propositions
