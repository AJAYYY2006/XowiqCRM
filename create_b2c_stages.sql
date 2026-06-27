-- Run this SQL in your Supabase SQL Editor
-- This adds the Stage Tracking functionality for the B2C Mode

-- ============================================
-- 1. b2c_stages table (with user_id column)
-- ============================================
CREATE TABLE IF NOT EXISTS b2c_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#f97316',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE b2c_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own stages" ON b2c_stages;
CREATE POLICY "Users can manage their own stages" ON b2c_stages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 2. b2c_customer_stages table (stage history)
-- ============================================
CREATE TABLE IF NOT EXISTS b2c_customer_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  stage_id UUID REFERENCES b2c_stages(id),
  service_id UUID,
  moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE b2c_customer_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage customer stages" ON b2c_customer_stages;
CREATE POLICY "Authenticated users can manage customer stages" ON b2c_customer_stages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 3. Add b2c_stage_id to accounts table
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'b2c_stage_id') THEN
    ALTER TABLE accounts ADD COLUMN b2c_stage_id UUID REFERENCES b2c_stages(id) ON DELETE SET NULL;
  END IF;
END $$;
