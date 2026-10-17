-- Rendez-vous Cal.com rattachés aux leads (webhook /api/public/calcom-webhook)
alter table leads add column if not exists rdv_at timestamptz;
alter table leads add column if not exists rdv_uid text;
