-- Anti-spam partagé entre tous les serveurs Vercel (28/10/2026) — à lancer dans Supabase › SQL Editor.
-- Ne supprime aucune donnée. Peut être relancé sans risque.
-- Tant que ce fichier n'est pas lancé, l'admin utilise un compteur en mémoire (moins efficace).
-- Le compteur garde une ligne par adresse IP et par type de formulaire : la table reste toute petite.

CREATE TABLE IF NOT EXISTS public.limites_requetes (
  cle   text PRIMARY KEY,
  n     integer NOT NULL,
  debut timestamptz NOT NULL
);
ALTER TABLE public.limites_requetes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.limites_requetes FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.limites_requetes TO service_role;

-- Renvoie true quand la limite est dépassée (p_max requêtes par fenêtre de p_fenetre_s secondes pour la clé).
CREATE OR REPLACE FUNCTION public.limite_requetes(p_cle text, p_max integer, p_fenetre_s integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n integer;
BEGIN
  INSERT INTO public.limites_requetes AS l (cle, n, debut)
  VALUES (p_cle, 1, now())
  ON CONFLICT (cle) DO UPDATE SET
    n     = CASE WHEN l.debut < now() - make_interval(secs => p_fenetre_s) THEN 1 ELSE l.n + 1 END,
    debut = CASE WHEN l.debut < now() - make_interval(secs => p_fenetre_s) THEN now() ELSE l.debut END
  RETURNING l.n INTO v_n;
  RETURN v_n > p_max;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.limite_requetes(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.limite_requetes(text, integer, integer) TO service_role;
