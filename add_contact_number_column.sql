-- Add contact_number column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_number TEXT DEFAULT '';
