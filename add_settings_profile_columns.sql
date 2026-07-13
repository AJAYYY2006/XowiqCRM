-- ============================================================
-- Settings Page: New Profile Columns Migration
-- Run this once in your Supabase SQL editor.
-- All columns are added with IF NOT EXISTS so it is safe to
-- re-run — it will not overwrite or break existing data.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS business_name       TEXT,
  ADD COLUMN IF NOT EXISTS business_logo_url   TEXT,
  ADD COLUMN IF NOT EXISTS business_address    TEXT,
  ADD COLUMN IF NOT EXISTS gst_id              TEXT,
  ADD COLUMN IF NOT EXISTS tax_rate            NUMERIC(5,2) DEFAULT 18,
  ADD COLUMN IF NOT EXISTS payment_due_days    INTEGER      DEFAULT 15;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN (
    'business_name',
    'business_logo_url',
    'business_address',
    'gst_id',
    'tax_rate',
    'payment_due_days'
  )
ORDER BY column_name;
