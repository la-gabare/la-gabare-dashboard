ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS plan_editorial_valide boolean DEFAULT false;
