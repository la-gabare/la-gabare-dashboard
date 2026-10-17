-- Demandes de résiliation / changement de formule depuis l'espace client
-- À exécuter une fois dans Supabase > SQL Editor.
alter table clients add column if not exists resiliation_demandee_at timestamptz;
alter table clients add column if not exists changement_formule_demande text;
-- date_fin_abonnement (déjà existante) reçoit la date d'effet de la résiliation
