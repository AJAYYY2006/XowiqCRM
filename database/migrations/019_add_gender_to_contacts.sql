-- Migration 019: Add gender column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS gender text;
