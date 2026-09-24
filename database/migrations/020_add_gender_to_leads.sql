-- ==============================================================================
-- 020_add_gender_to_leads.sql
-- Add gender column to leads table
-- ==============================================================================

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS gender text;
