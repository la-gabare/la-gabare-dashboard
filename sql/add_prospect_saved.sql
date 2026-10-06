-- Module Prospection : bouton « Sauvegarder » (à exécuter une fois dans Supabase si les tables existent déjà)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS saved    smallint DEFAULT 0;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS saved_at timestamptz;
CREATE INDEX IF NOT EXISTS prospects_saved_idx ON prospects (saved) WHERE saved = 1;
