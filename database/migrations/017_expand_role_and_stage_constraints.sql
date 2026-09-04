-- ==============================================================================
-- 017_expand_role_and_stage_constraints.sql
-- Expand profiles.role check constraint and opportunities.stage flexibility
-- ==============================================================================

-- 1. Expand profiles.role check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY[
    'admin'::text, 'administrator'::text, 'manager'::text, 'agent'::text, 
    'user'::text, 'viewer'::text, 'sales_rep'::text, 'support_agent'::text
  ]));

-- 2. Expand opportunities.stage check constraint to support both title & lowercase stages
ALTER TABLE public.opportunities DROP CONSTRAINT IF EXISTS opportunities_stage_check;
ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_stage_check
  CHECK (stage = ANY (ARRAY[
    'Prospecting'::text, 'Scoping'::text, 'Negotiation'::text, 'Legal'::text, 'Contract'::text, 'Closed'::text,
    'prospecting'::text, 'qualification'::text, 'proposal'::text, 'negotiation'::text, 'closed_won'::text, 'closed_lost'::text
  ]));

-- 3. Expand invoices.status check constraint
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text, 'sent'::text, 'paid'::text, 'overdue'::text,
    'Draft'::text, 'Sent'::text, 'Paid'::text, 'Overdue'::text, 'Unpaid'::text, 'Cancelled'::text
  ]));
