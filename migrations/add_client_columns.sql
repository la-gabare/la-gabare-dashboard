-- Migration: Add notification and payment columns to clients table
-- Execute this in Supabase SQL Editor

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS notif_published BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notif_validation BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notif_feedback BOOLEAN DEFAULT true;

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'clients'
ORDER BY ordinal_position;
