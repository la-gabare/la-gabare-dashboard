-- Verrou anti-double exécution des crons (03/11/2026) — à lancer dans Supabase › SQL Editor, AVANT de publier le code.
-- Ne supprime aucune donnée. Peut être relancé sans risque. Une ligne par cron : la table reste minuscule.
-- Tant que ce fichier n'est pas lancé, le cron s'exécute sans verrou (comportement actuel).

CREATE TABLE IF NOT EXISTS public.verrous_cron (
  nom      text PRIMARY KEY,
  jusqu_a  timestamptz NOT NULL
);
ALTER TABLE public.verrous_cron ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.verrous_cron FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.verrous_cron TO service_role;

-- true = verrou obtenu ; false = une autre exécution est en cours (le verrou expire tout seul après p_duree_s).
CREATE OR REPLACE FUNCTION public.prendre_verrou_cron(p_nom text, p_duree_s integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nom text;
BEGIN
  INSERT INTO public.verrous_cron AS v (nom, jusqu_a)
  VALUES (p_nom, now() + make_interval(secs => p_duree_s))
  ON CONFLICT (nom) DO UPDATE SET jusqu_a = now() + make_interval(secs => p_duree_s)
    WHERE v.jusqu_a < now()
  RETURNING v.nom INTO v_nom;
  RETURN v_nom IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.liberer_verrou_cron(p_nom text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$ UPDATE public.verrous_cron SET jusqu_a = now() - interval '1 second' WHERE nom = p_nom; $$;

REVOKE ALL ON FUNCTION public.prendre_verrou_cron(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.liberer_verrou_cron(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prendre_verrou_cron(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.liberer_verrou_cron(text) TO service_role;
