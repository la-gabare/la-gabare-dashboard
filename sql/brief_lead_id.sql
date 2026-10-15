-- Rattache chaque brief détaillé (formulaire_complet) à son lead. Idempotent.
ALTER TABLE formulaire_complet
  ADD COLUMN IF NOT EXISTS lead_id BIGINT REFERENCES leads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS formulaire_complet_lead_idx ON formulaire_complet (lead_id);

-- Briefs déjà reçus : rattachement au lead le plus récent ayant la même adresse e-mail
UPDATE formulaire_complet f
   SET lead_id = (
     SELECT l.id FROM leads l
      WHERE lower(l.email) = lower(f.email)
      ORDER BY l.created_at DESC LIMIT 1)
 WHERE f.lead_id IS NULL AND f.email IS NOT NULL;

-- Les leads qui ont rempli leur brief passent en « Formulaire complété »
UPDATE leads SET statut = 'formulaire_complete'
 WHERE id IN (SELECT lead_id FROM formulaire_complet WHERE lead_id IS NOT NULL)
   AND coalesce(statut, 'reception') IN ('reception', 'mail_envoye', 'relance');

SELECT f.id AS brief, f.nom_domaine, f.lead_id, l.statut
  FROM formulaire_complet f LEFT JOIN leads l ON l.id = f.lead_id
 ORDER BY f.created_at DESC LIMIT 5;
