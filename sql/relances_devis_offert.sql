-- Relances automatiques des devis non acceptés et suivi de la fin des mois d'accompagnement offerts
-- À exécuter une fois dans Supabase > SQL Editor.
alter table devis add column if not exists relances int not null default 0;
alter table devis add column if not exists derniere_relance_at timestamptz;
-- Dernier rappel « fin des mois offerts » envoyé : j15, j7, fin
alter table clients add column if not exists rappel_offert text;
