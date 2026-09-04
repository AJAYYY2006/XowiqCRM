-- Run this SQL in your Supabase SQL Editor to support custom fields in Tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;
