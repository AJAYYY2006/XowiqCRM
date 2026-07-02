-- Run this SQL in your Supabase SQL Editor to support custom fields in Service History
ALTER TABLE public.customer_services ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;
