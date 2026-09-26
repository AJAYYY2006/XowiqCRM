-- ============================================================================
-- 025_per_company_structured_ids.sql
-- 022_structured_unique_ids.sql used a single global counter per prefix/year,
-- shared across every tenant on the platform, padded to only 3 digits. A
-- single company can have lakhs of leads (and other records), so numbering
-- needs to be scoped per company (not shared platform-wide) and wide enough
-- to not run out. This migration:
--   * scopes id_sequences per (prefix, company, year) instead of (prefix, year)
--   * widens the sequence to 6 digits (up to 999,999/year/company)
--   * embeds a short, stable per-company code in the id so global string
--     uniqueness still holds even though each company counts from 1
-- New format: PREFIX-CODE-YY-NNNNNN  (e.g. LD-001-26-000001)
-- "Company" = the Super Admin/tenant owner returned by public.team_admin_id()
-- (same tenant boundary already used by the RLS policies in 018).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Stable short code per tenant, assigned on first use.
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.company_code_seq START 1;

CREATE TABLE IF NOT EXISTS public.company_codes (
  team_admin_id uuid PRIMARY KEY,
  code          text UNIQUE NOT NULL
);

CREATE OR REPLACE FUNCTION public.get_company_code(p_team_admin_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_code text;
BEGIN
  SELECT code INTO v_code FROM public.company_codes WHERE team_admin_id = p_team_admin_id;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  INSERT INTO public.company_codes (team_admin_id, code)
  VALUES (p_team_admin_id, lpad(nextval('public.company_code_seq')::text, 3, '0'))
  ON CONFLICT (team_admin_id) DO NOTHING;

  SELECT code INTO v_code FROM public.company_codes WHERE team_admin_id = p_team_admin_id;
  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_code(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Re-key id_sequences per (prefix, company, year). Safe to rebuild from
-- scratch: it only holds an internal running counter, never user-facing data.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.id_sequences;

CREATE TABLE public.id_sequences (
  prefix        text NOT NULL,
  team_admin_id uuid NOT NULL,
  year          int  NOT NULL,
  last_value    int  NOT NULL DEFAULT 0,
  PRIMARY KEY (prefix, team_admin_id, year)
);

-- Drop 022's single-arg version with CASCADE — this only removes the column
-- DEFAULTs that referenced it (re-set below), not the columns themselves.
DROP FUNCTION IF EXISTS public.next_structured_id(text) CASCADE;

CREATE FUNCTION public.next_structured_id(p_prefix text, p_team_admin_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_team uuid := COALESCE(p_team_admin_id, public.team_admin_id());
  v_year int  := (extract(year from now())::int % 100);
  v_code text;
  v_next int;
BEGIN
  v_code := public.get_company_code(v_team);

  INSERT INTO public.id_sequences (prefix, team_admin_id, year, last_value)
  VALUES (p_prefix, v_team, v_year, 1)
  ON CONFLICT (prefix, team_admin_id, year)
  DO UPDATE SET last_value = public.id_sequences.last_value + 1
  RETURNING last_value INTO v_next;

  RETURN p_prefix || '-' || v_code || '-' || v_year::text || '-' || lpad(v_next::text, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_structured_id(text, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Re-point column DEFAULTs at the new function (CASCADE above only cleared them).
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads ALTER COLUMN unique_id SET DEFAULT public.next_structured_id('LD');
ALTER TABLE public.contacts ALTER COLUMN unique_id SET DEFAULT public.next_structured_id('CT');
ALTER TABLE public.tickets ALTER COLUMN ticket_no SET DEFAULT public.next_structured_id('TK');
ALTER TABLE public.accounts ALTER COLUMN unique_id SET DEFAULT public.next_structured_id('AC');
ALTER TABLE public.opportunities ALTER COLUMN unique_id SET DEFAULT public.next_structured_id('OP');
ALTER TABLE public.tasks ALTER COLUMN unique_id SET DEFAULT public.next_structured_id('TS');
-- quotes.unique_id is still handled by the set_quote_unique_id() BEFORE INSERT
-- trigger from 022, which calls next_structured_id() by name and therefore
-- automatically resolves to this new version — no change needed there.

-- ---------------------------------------------------------------------------
-- Re-seed every existing record under the new per-company format, oldest
-- first per company, so each tenant's history numbers cleanly from 1.
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record; v_team uuid;
BEGIN
  FOR r IN SELECT id, user_id FROM public.leads ORDER BY created_at LOOP
    v_team := COALESCE(public.admin_of(r.user_id), r.user_id);
    UPDATE public.leads SET unique_id = public.next_structured_id('LD', v_team) WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id, user_id FROM public.contacts ORDER BY created_at LOOP
    v_team := COALESCE(public.admin_of(r.user_id), r.user_id);
    UPDATE public.contacts SET unique_id = public.next_structured_id('CT', v_team) WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id, user_id FROM public.tickets ORDER BY created_at LOOP
    v_team := COALESCE(public.admin_of(r.user_id), r.user_id);
    UPDATE public.tickets SET ticket_no = public.next_structured_id('TK', v_team) WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id, user_id FROM public.accounts ORDER BY created_at LOOP
    v_team := COALESCE(public.admin_of(r.user_id), r.user_id);
    UPDATE public.accounts SET unique_id = public.next_structured_id('AC', v_team) WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id, user_id FROM public.opportunities ORDER BY created_at LOOP
    v_team := COALESCE(public.admin_of(r.user_id), r.user_id);
    UPDATE public.opportunities SET unique_id = public.next_structured_id('OP', v_team) WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id, user_id FROM public.tasks ORDER BY created_at LOOP
    v_team := COALESCE(public.admin_of(r.user_id), r.user_id);
    UPDATE public.tasks SET unique_id = public.next_structured_id('TS', v_team) WHERE id = r.id;
  END LOOP;

  FOR r IN
    SELECT id, user_id, invoice_number, quote_name FROM public.quotes ORDER BY created_at
  LOOP
    v_team := COALESCE(public.admin_of(r.user_id), r.user_id);
    DECLARE
      v_is_invoice boolean := false;
    BEGIN
      IF r.invoice_number IS NOT NULL THEN
        v_is_invoice := true;
      ELSE
        BEGIN
          v_is_invoice := COALESCE((r.quote_name::jsonb ->> 'is_invoice')::boolean, false);
        EXCEPTION WHEN OTHERS THEN
          v_is_invoice := false;
        END;
      END IF;

      UPDATE public.quotes
         SET unique_id = public.next_structured_id(CASE WHEN v_is_invoice THEN 'IN' ELSE 'QT' END, v_team)
       WHERE id = r.id;
    END;
  END LOOP;
END $$;
