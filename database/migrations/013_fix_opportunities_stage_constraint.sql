-- Fix: Drop the old stage check constraint and recreate it with the correct stage values
-- Run this in your Supabase SQL Editor

ALTER TABLE public.opportunities 
  DROP CONSTRAINT IF EXISTS opportunities_stage_check;

ALTER TABLE public.opportunities 
  ADD CONSTRAINT opportunities_stage_check 
  CHECK (stage IN (
    'Prospecting',
    'Scoping',
    'Negotiation',
    'Legal',
    'Contract',
    'Closed'
  ));
