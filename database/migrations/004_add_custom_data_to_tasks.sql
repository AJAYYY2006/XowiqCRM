-- Run this SQL in your Supabase SQL Editor to support custom fields in Tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;
