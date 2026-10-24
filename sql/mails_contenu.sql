-- Mails de contenu envoyés par l'admin (remplacent le workflow n8n « Agent de contenu mensuel »).
-- À exécuter une fois dans Supabase > SQL Editor, AVANT de publier le code qui les utilise.
alter table plans_generation add column if not exists apercu_envoye_at timestamptz;     -- « aperçu du mois à valider »
alter table plans_generation add column if not exists programme_envoye_at timestamptz;  -- « votre programme du mois »
-- Les plans déjà traités avant cette migration ne doivent déclencher aucun mail
update plans_generation set apercu_envoye_at = now(), programme_envoye_at = now() where status = 'termine';
