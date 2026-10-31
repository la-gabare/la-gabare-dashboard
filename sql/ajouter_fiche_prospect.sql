-- Description détaillée du prospect (ce que Harness Maxxing a trouvé : identité, cuvées, présence en ligne, angles).
-- À exécuter une fois dans Supabase > SQL Editor, AVANT de publier le code qui en dépend.
-- Texte sans coordonnées personnelles du dirigeant (le script les écarte).

alter table prospects_hm add column if not exists fiche text;
