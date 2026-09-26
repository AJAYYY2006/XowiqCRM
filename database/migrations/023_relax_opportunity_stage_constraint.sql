-- ============================================================================
-- 023_relax_opportunity_stage_constraint.sql
-- Pipeline stages are user-customizable via Settings > Pipeline (persisted to
-- localStorage and pushed into opportunities.stage), but a hardcoded CHECK
-- constraint from 017_expand_role_and_stage_constraints.sql only allowed a
-- fixed set of stage names. Saving any custom stage therefore violated the
-- constraint and silently broke the Opportunities edit form. Replace the
-- fixed enum with a simple non-empty check.
-- ============================================================================

ALTER TABLE public.opportunities DROP CONSTRAINT IF EXISTS opportunities_stage_check;

ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_stage_check CHECK (stage IS NOT NULL AND btrim(stage) <> '');
