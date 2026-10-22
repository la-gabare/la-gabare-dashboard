-- Rapport mensuel envoyé au client (mois déjà traité, ex. 2026-10) — évite les doublons
-- À exécuter une fois dans Supabase > SQL Editor.
alter table clients add column if not exists rapport_mensuel_mois text;
