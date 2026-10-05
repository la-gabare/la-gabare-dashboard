-- Module Prospection : à exécuter une fois dans Supabase (SQL Editor).
-- Les 3 tables ne sont accessibles qu'avec la clé service (RLS activée, aucune policy).

CREATE TABLE IF NOT EXISTS prospects (
  siren          text PRIMARY KEY,
  siret          text,
  name           text,
  brand          text,
  legal          text,
  legal_code     text,
  naf            text,
  address        text,
  cp             text,
  commune        text,
  dept           text,
  zone           text,
  lat            double precision,
  lon            double precision,
  created        text,                 -- date de création de l'entreprise (YYYY-MM-DD)
  eff_code       text,
  eff_mid        double precision,
  nb_etab        integer,
  nb_open        integer,
  bio            smallint DEFAULT 0,
  dirigeant      text,
  dir_first      text,
  dir_birth      integer,
  successor      smallint DEFAULT 0,
  ca             double precision,
  ca_prev        double precision,
  ca_year        integer,
  resultat       double precision,
  coop           smallint DEFAULT 0,
  vinifie        smallint DEFAULT 0,
  -- site web & audit
  url            text,
  url_source     text,                 -- 'auto' | 'manual'
  url_verified   smallint DEFAULT 0,
  site_status    text DEFAULT 'inconnu', -- inconnu | aucun | hs | obsolete | vieillissant | moderne
  site_checked   timestamptz,
  email          text,
  phone          text,
  socials        jsonb DEFAULT '{}'::jsonb,
  audit          jsonb,
  audit_at       timestamptz,
  gbp            jsonb,
  -- suivi commercial
  status         text DEFAULT 'Nouveau',
  notes          text DEFAULT '',
  next_action    date,
  last_contact   date,
  -- scoring (recalculé par l'application)
  score          double precision DEFAULT 0,
  prio           text DEFAULT 'C',
  pack           text,
  abo            text,
  deal           double precision DEFAULT 0,
  mrr            double precision DEFAULT 0,
  signals        jsonb DEFAULT '[]'::jsonb,
  breakdown      jsonb DEFAULT '{}'::jsonb,
  -- colonnes dérivées (filtres rapides)
  growth         smallint DEFAULT 0,
  coopteur       smallint DEFAULT 0,
  obs            integer,
  f_no_social    smallint DEFAULT 0,
  f_no_shop      smallint DEFAULT 0,
  f_no_evin      smallint DEFAULT 0,
  f_no_mobile    smallint DEFAULT 0,
  f_no_https     smallint DEFAULT 0,
  f_tourism      smallint DEFAULT 0,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prospects_dept_idx   ON prospects (dept);
CREATE INDEX IF NOT EXISTS prospects_status_idx ON prospects (status);
CREATE INDEX IF NOT EXISTS prospects_score_idx  ON prospects (score DESC);
CREATE INDEX IF NOT EXISTS prospects_site_idx   ON prospects (site_status);
CREATE INDEX IF NOT EXISTS prospects_prio_idx   ON prospects (prio);
CREATE INDEX IF NOT EXISTS prospects_next_idx   ON prospects (next_action);

CREATE TABLE IF NOT EXISTS prospect_activities (
  id     bigserial PRIMARY KEY,
  siren  text NOT NULL REFERENCES prospects(siren) ON DELETE CASCADE,
  ts     timestamptz DEFAULT now(),
  kind   text,
  text   text
);
CREATE INDEX IF NOT EXISTS prospect_activities_siren_idx ON prospect_activities (siren, id DESC);

CREATE TABLE IF NOT EXISTS prospection_settings (
  k text PRIMARY KEY,
  v text
);

ALTER TABLE prospects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_activities   ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospection_settings  ENABLE ROW LEVEL SECURITY;
