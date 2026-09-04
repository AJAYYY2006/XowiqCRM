-- Run this SQL in your Supabase SQL Editor
-- This script adds the newly introduced B2C customer profile columns to the 'accounts' table

DO $$ 
BEGIN
  -- 1. Add 'address' column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'address') THEN
    ALTER TABLE accounts ADD COLUMN address TEXT;
  END IF;

  -- 2. Add 'gender' column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'gender') THEN
    ALTER TABLE accounts ADD COLUMN gender TEXT;
  END IF;

  -- 3. Add 'date_of_birth' column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'date_of_birth') THEN
    ALTER TABLE accounts ADD COLUMN date_of_birth DATE;
  END IF;

  -- 4. Add 'notes' column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'notes') THEN
    ALTER TABLE accounts ADD COLUMN notes TEXT;
  END IF;

  -- 5. Add 'custom_data' JSONB column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'custom_data') THEN
    ALTER TABLE accounts ADD COLUMN custom_data JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- 6. Add 'email' and 'phone' directly to accounts (since B2C profiles reference them here directly alongside contacts)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'email') THEN
    ALTER TABLE accounts ADD COLUMN email TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'phone') THEN
    ALTER TABLE accounts ADD COLUMN phone TEXT;
  END IF;

END $$;
