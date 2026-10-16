-- Espace professionnels (Pack Pro / Premium) : comptes pros, accès par lien, demandes de commande / d'échantillons.
-- À exécuter dans Supabase > SQL Editor. Idempotent.

-- 1. Tarifs pros et fiche technique sur les cuvées
ALTER TABLE produits
  ADD COLUMN IF NOT EXISTS prix_pro_cents INTEGER CHECK (prix_pro_cents IS NULL OR prix_pro_cents >= 0), -- HT, null = pas proposé aux pros
  ADD COLUMN IF NOT EXISTS fiche_technique_url TEXT;

-- 2. Comptes professionnels d'un domaine
CREATE TABLE IF NOT EXISTS pros (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  entreprise TEXT NOT NULL,
  siret TEXT,
  activite TEXT,                -- caviste, restaurant, hôtel, épicerie fine, export, autre
  nom TEXT,
  telephone TEXT,
  ville TEXT,
  message TEXT,
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'valide', 'refuse', 'revoque')),
  acces_hash TEXT,              -- empreinte SHA-256 du lien d'accès (le lien lui-même n'est jamais stocké)
  acces_expire_at TIMESTAMPTZ,
  derniere_connexion_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valide_at TIMESTAMPTZ,
  UNIQUE (client_id, email)
);
CREATE INDEX IF NOT EXISTS pros_client_idx ON pros (client_id, statut);
CREATE INDEX IF NOT EXISTS pros_acces_idx ON pros (acces_hash);

-- 3. Demandes envoyées par les pros (commande ou échantillons) — pas de paiement en ligne en B2B
CREATE TABLE IF NOT EXISTS pro_demandes (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  pro_id BIGINT NOT NULL REFERENCES pros(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('commande', 'echantillons')),
  lignes JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{ produit_id, nom, millesime, prix_pro_cents, quantite }]
  total_ht_cents INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  statut TEXT NOT NULL DEFAULT 'nouvelle' CHECK (statut IN ('nouvelle', 'traitee', 'annulee')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  traitee_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS pro_demandes_client_idx ON pro_demandes (client_id, created_at DESC);

-- Accès uniquement par le serveur (clé service role)
ALTER TABLE pros ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_demandes ENABLE ROW LEVEL SECURITY;
