-- Données de démonstration de la boutique (mode test Stripe). Idempotent.
-- Client « Domaine Moreau (démo) », domaine demo.la-gabare.fr, 3 cuvées.
DO $$
DECLARE v_id BIGINT;
BEGIN
  SELECT id INTO v_id FROM clients WHERE domaine = 'demo.la-gabare.fr' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO clients (nom_domaine, email_contact, abonnement, statut, domaine, site_url, pack_site)
    VALUES ('Domaine Moreau (démo)', 'louisbruz50+demo@gmail.com', 'reserve', 'actif',
            'demo.la-gabare.fr', 'https://demo.la-gabare.fr', 'pro')
    RETURNING id INTO v_id;
  END IF;

  UPDATE clients SET
    boutique_active = true,
    boutique_config = '{"frais_port":[{"jusqua":3,"prix":1290},{"jusqua":6,"prix":1590},{"jusqua":12,"prix":1990},{"jusqua":18,"prix":2690},{"jusqua":36,"prix":3990}],
                        "franco_bouteilles":12,"retrait_caveau":true,"email_notif":"louisbruz50+demo@gmail.com","max_bouteilles":36}'::jsonb
  WHERE id = v_id;

  INSERT INTO produits (client_id, slug, nom, millesime, couleur, appellation, description, accords, prix_cents, stock, ordre)
  VALUES
    (v_id, 'argile-blanc', 'L''Argile Blanc', '2023', 'Blanc sec', 'Montlouis-sur-Loire AOC',
     'Chenin blanc sur argile à silex. Citron confit, poire williams et fleurs blanches, une bouche vive, minérale et saline.',
     'Poissons grillés, crustacés, chèvre frais.', 1250, 140, 1),
    (v_id, 'les-tuffeaux', 'Les Tuffeaux', '2022', 'Blanc demi-sec', 'Montlouis-sur-Loire AOC',
     'Le demi-sec du tuffeau : coing, miel d''acacia et une acidité qui tient le sucre en équilibre.',
     'Cuisine épicée, volaille à la crème, tarte aux pommes.', 1400, 8, 2),
    (v_id, 'grain-noble', 'Grain Noble', '2020', 'Blanc moelleux', 'Montlouis-sur-Loire AOC',
     'Vendanges par tries successives. Abricot sec, safran et une longue finale fraîche.',
     'Foie gras, roquefort, desserts aux fruits jaunes.', 2200, 36, 3)
  ON CONFLICT (client_id, slug) DO NOTHING;
END $$;

SELECT c.id, c.nom_domaine, c.domaine, c.boutique_active, count(p.id) AS cuvees
FROM clients c LEFT JOIN produits p ON p.client_id = c.id
WHERE c.domaine = 'demo.la-gabare.fr'
GROUP BY c.id;
