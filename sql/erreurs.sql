-- Journal des erreurs de l'admin (alertes e-mail, sans doublon) — À exécuter une fois dans Supabase > SQL Editor.
create table if not exists erreurs (
  signature text primary key,              -- empreinte du message (sans chiffres variables)
  message text not null,
  occurrences int not null default 1,
  premiere_at timestamptz not null default now(),
  derniere_at timestamptz not null default now(),
  alerte_at timestamptz                    -- dernier e-mail envoyé pour cette erreur
);
alter table erreurs enable row level security;
-- Aucune policy : seules les routes serveur (clé service) y accèdent.
