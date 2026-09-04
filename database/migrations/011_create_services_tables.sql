-- Run this SQL in your Supabase SQL Editor
-- This fix ensures the 'tasks' table matches the B2C Customer Profile requirements.

-- 1. Add account_id to 'tasks' table (Critical for Service Reminders)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'account_id') THEN
    ALTER TABLE tasks ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Ensure account_id exists in 'quotes' table as well
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'account_id') THEN
    ALTER TABLE quotes ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;
  END IF;
END $$;
