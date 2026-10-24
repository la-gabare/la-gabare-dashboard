-- Notification Telegram du plan éditorial complet, avant l'envoi de l'aperçu au vigneron.
-- À exécuter une fois dans Supabase > SQL Editor.
alter table plans_generation add column if not exists plan_notifie_at timestamptz;
-- Les plans dont l'aperçu est déjà parti ne sont pas notifiés de nouveau
update plans_generation set plan_notifie_at = now() where apercu_envoye_at is not null;
