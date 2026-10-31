-- Supprime les données de l'ancien module Prospection (remplacé par les prospects de Harness Maxxing).
-- IRRÉVERSIBLE : exporter d'abord (Supabase > Table Editor > prospects > Export CSV) si besoin.
-- À exécuter par l'utilisateur dans Supabase > SQL Editor, APRÈS la publication du code sans prospection.
-- Ne pas exécuter avant : l'ancienne page lirait des tables absentes.

DROP TABLE IF EXISTS prospect_activities;
DROP TABLE IF EXISTS prospection_settings;
DROP TABLE IF EXISTS prospects;
