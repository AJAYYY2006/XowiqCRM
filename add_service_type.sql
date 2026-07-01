-- Add service_type column to services table
-- 'Instant' = no Kanban card, completed immediately
-- 'Multi-Stage' = creates Kanban card, moves through stages (existing behavior)

ALTER TABLE services ADD COLUMN IF NOT EXISTS service_type text DEFAULT 'Instant';

-- Set ALL existing services to 'Multi-Stage' so existing Kanban work is preserved
UPDATE services SET service_type = 'Multi-Stage' WHERE service_type IS NULL OR service_type = 'Instant';
