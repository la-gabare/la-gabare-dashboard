-- Rapport d'audit gratuit généré automatiquement (IA) et envoyé au prospect
-- À exécuter une fois dans Supabase > SQL Editor.
alter table leads add column if not exists rapport_audit jsonb;
alter table leads add column if not exists rapport_envoye_at timestamptz;
alter table leads add column if not exists rapport_token text;
