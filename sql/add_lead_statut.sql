ALTER TABLE leads ADD COLUMN IF NOT EXISTS statut text DEFAULT 'reception';
-- Valeurs attendues: reception, mail_envoye, relance, rdv_pris, formulaire_complete, archive
