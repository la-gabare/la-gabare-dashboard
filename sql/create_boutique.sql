-- Boutique HTML (étape 1) : produits, commandes, réservation de stock
-- À exécuter dans Supabase > SQL Editor. Idempotent.

-- 1. Colonnes boutique sur les clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS boutique_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS publish_token TEXT,
  -- { frais_port: [{ jusqua: 6, prix: 1590 }], franco_bouteilles: 12, retrait_caveau: true,
  --   email_notif: "...", max_bouteilles: 36, cgv_url: "https://.../cgv.html" }
  ADD COLUMN IF NOT EXISTS boutique_config JSONB DEFAULT '{}'::jsonb;

-- 2. Produits (cuvées)
CREATE TABLE IF NOT EXISTS produits (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  nom TEXT NOT NULL,
  millesime TEXT,
  couleur TEXT,                -- blanc, rouge, rosé, pétillant, moelleux…
  appellation TEXT,
  contenance TEXT DEFAULT '75 cl',
  description TEXT,
  accords TEXT,
  prix_cents INTEGER NOT NULL CHECK (prix_cents >= 0),   -- prix TTC
  tva_taux NUMERIC(4,2) NOT NULL DEFAULT 20.00,
  bouteilles_par_unite INTEGER NOT NULL DEFAULT 1 CHECK (bouteilles_par_unite > 0), -- 6 pour un carton
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  seuil_alerte INTEGER NOT NULL DEFAULT 12,
  image_url TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  ordre INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, slug)
);
CREATE INDEX IF NOT EXISTS produits_client_idx ON produits (client_id, actif, ordre);

-- 3. Commandes
CREATE TABLE IF NOT EXISTS commandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  numero INTEGER,              -- attribué au paiement, séquentiel par domaine
  statut TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente','payee','preparee','expediee','livree','annulee','abandonnee')),
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent TEXT,
  email TEXT,
  nom TEXT,
  telephone TEXT,
  livraison JSONB,             -- { mode: 'livraison'|'retrait', adresse: {...} }
  lignes JSONB NOT NULL,       -- [{ produit_id, nom, millesime, prix_cents, quantite, bouteilles }]
  sous_total_cents INTEGER NOT NULL,
  frais_port_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  transporteur TEXT,
  numero_suivi TEXT,
  note_interne TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  UNIQUE (client_id, numero)
);
CREATE INDEX IF NOT EXISTS commandes_client_idx ON commandes (client_id, created_at DESC);

-- Tables accessibles uniquement par le serveur (clé service role) : RLS sans policy = refus pour anon
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;

-- 4. Réserve le stock de toutes les lignes et crée la commande en attente, ou rien (exception => rollback)
CREATE OR REPLACE FUNCTION boutique_reserver(
  p_client_id BIGINT, p_lignes JSONB, p_sous_total INT, p_frais_port INT, p_livraison JSONB
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE l JSONB; v_id UUID;
BEGIN
  FOR l IN SELECT * FROM jsonb_array_elements(p_lignes) LOOP
    UPDATE produits
       SET stock = stock - (l->>'quantite')::INT, updated_at = now()
     WHERE id = (l->>'produit_id')::BIGINT
       AND client_id = p_client_id
       AND actif
       AND stock >= (l->>'quantite')::INT;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'stock_insuffisant:%', l->>'produit_id';
    END IF;
  END LOOP;
  INSERT INTO commandes (client_id, lignes, sous_total_cents, frais_port_cents, total_cents, livraison)
  VALUES (p_client_id, p_lignes, p_sous_total, p_frais_port, p_sous_total + p_frais_port, p_livraison)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- 5. Rend le stock d'une commande non payée (session expirée / échec). Idempotent.
CREATE OR REPLACE FUNCTION boutique_liberer(p_commande_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE c commandes; l JSONB;
BEGIN
  SELECT * INTO c FROM commandes WHERE id = p_commande_id FOR UPDATE;
  IF NOT FOUND OR c.statut <> 'en_attente' THEN RETURN; END IF;
  FOR l IN SELECT * FROM jsonb_array_elements(c.lignes) LOOP
    UPDATE produits SET stock = stock + (l->>'quantite')::INT, updated_at = now()
     WHERE id = (l->>'produit_id')::BIGINT AND client_id = c.client_id;
  END LOOP;
  UPDATE commandes SET statut = 'abandonnee' WHERE id = p_commande_id;
END $$;

-- 6. Marque une commande payée et lui attribue le numéro suivant du domaine. Idempotent.
CREATE OR REPLACE FUNCTION boutique_payer(
  p_commande_id UUID, p_payment_intent TEXT, p_email TEXT, p_nom TEXT, p_telephone TEXT, p_livraison JSONB
) RETURNS commandes LANGUAGE plpgsql AS $$
DECLARE c commandes;
BEGIN
  SELECT * INTO c FROM commandes WHERE id = p_commande_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'commande_introuvable'; END IF;
  IF c.statut <> 'en_attente' THEN RETURN c; END IF;
  PERFORM pg_advisory_xact_lock(c.client_id);
  UPDATE commandes SET
    statut = 'payee',
    paid_at = now(),
    numero = (SELECT COALESCE(MAX(numero), 0) + 1 FROM commandes WHERE client_id = c.client_id),
    stripe_payment_intent = p_payment_intent,
    email = COALESCE(p_email, email),
    nom = COALESCE(p_nom, nom),
    telephone = COALESCE(p_telephone, telephone),
    livraison = COALESCE(p_livraison, livraison)
  WHERE id = p_commande_id
  RETURNING * INTO c;
  RETURN c;
END $$;

-- Les fonctions ne sont appelables que par le serveur
REVOKE ALL ON FUNCTION boutique_reserver(BIGINT, JSONB, INT, INT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION boutique_liberer(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION boutique_payer(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
