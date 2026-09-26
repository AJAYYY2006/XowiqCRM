-- ============================================================================
-- 022_structured_unique_ids.sql
-- Introduces a single, sequential, year-prefixed unique ID scheme
-- (e.g. LD-26001, AC-26001) shared by every entity that needs a
-- human-readable identifier, replacing the old random/uuid-fragment
-- defaults on leads/contacts/tickets and adding the same capability to
-- accounts, opportunities, quotes/invoices, and tasks.
-- ============================================================================

-- Per-prefix, per-year atomic counter.
CREATE TABLE IF NOT EXISTS public.id_sequences (
  prefix     text NOT NULL,
  year       int  NOT NULL,
  last_value int  NOT NULL DEFAULT 0,
  PRIMARY KEY (prefix, year)
);

-- Returns the next id for a prefix, formatted PREFIX-YYNNN (e.g. LD-26001).
-- Atomic via INSERT ... ON CONFLICT ... RETURNING, safe under concurrent inserts.
CREATE OR REPLACE FUNCTION public.next_structured_id(p_prefix text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_year int := (extract(year from now())::int % 100);
  v_next int;
BEGIN
  INSERT INTO public.id_sequences (prefix, year, last_value)
  VALUES (p_prefix, v_year, 1)
  ON CONFLICT (prefix, year)
  DO UPDATE SET last_value = public.id_sequences.last_value + 1
  RETURNING last_value INTO v_next;

  RETURN p_prefix || '-' || v_year::text || lpad(v_next::text, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_structured_id(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Repoint existing structured-ID columns to the new generator
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads ALTER COLUMN unique_id SET DEFAULT public.next_structured_id('LD');
ALTER TABLE public.contacts ALTER COLUMN unique_id SET DEFAULT public.next_structured_id('CT');
ALTER TABLE public.tickets ALTER COLUMN ticket_no SET DEFAULT public.next_structured_id('TK');

-- ---------------------------------------------------------------------------
-- Add unique_id to entities that don't have one yet
-- ---------------------------------------------------------------------------
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS unique_id text;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS unique_id text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS unique_id text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS unique_id text;

ALTER TABLE public.accounts ALTER COLUMN unique_id SET DEFAULT public.next_structured_id('AC');
ALTER TABLE public.opportunities ALTER COLUMN unique_id SET DEFAULT public.next_structured_id('OP');
ALTER TABLE public.tasks ALTER COLUMN unique_id SET DEFAULT public.next_structured_id('TS');

-- ---------------------------------------------------------------------------
-- quotes is dual-purpose (backs both Quotes and Invoices, distinguished by
-- invoice_number / an is_invoice flag inside the quote_name JSON string), so
-- a static column DEFAULT can't pick QT- vs IN- at insert time. Use a
-- BEFORE INSERT trigger instead.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_quote_unique_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_invoice boolean := false;
BEGIN
  IF NEW.unique_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.invoice_number IS NOT NULL THEN
    v_is_invoice := true;
  ELSE
    BEGIN
      v_is_invoice := COALESCE((NEW.quote_name::jsonb ->> 'is_invoice')::boolean, false);
    EXCEPTION WHEN OTHERS THEN
      v_is_invoice := false;
    END;
  END IF;

  NEW.unique_id := public.next_structured_id(CASE WHEN v_is_invoice THEN 'IN' ELSE 'QT' END);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quotes_unique_id ON public.quotes;
CREATE TRIGGER trg_quotes_unique_id
  BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_quote_unique_id();

-- ---------------------------------------------------------------------------
-- Backfill existing rows so history also gets sequential IDs, oldest first.
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.leads WHERE unique_id IS NULL ORDER BY created_at LOOP
    UPDATE public.leads SET unique_id = public.next_structured_id('LD') WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id FROM public.contacts WHERE unique_id IS NULL ORDER BY created_at LOOP
    UPDATE public.contacts SET unique_id = public.next_structured_id('CT') WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id FROM public.tickets WHERE ticket_no IS NULL ORDER BY created_at LOOP
    UPDATE public.tickets SET ticket_no = public.next_structured_id('TK') WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id FROM public.accounts WHERE unique_id IS NULL ORDER BY created_at LOOP
    UPDATE public.accounts SET unique_id = public.next_structured_id('AC') WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id FROM public.opportunities WHERE unique_id IS NULL ORDER BY created_at LOOP
    UPDATE public.opportunities SET unique_id = public.next_structured_id('OP') WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id FROM public.tasks WHERE unique_id IS NULL ORDER BY created_at LOOP
    UPDATE public.tasks SET unique_id = public.next_structured_id('TS') WHERE id = r.id;
  END LOOP;

  FOR r IN
    SELECT id, invoice_number, quote_name FROM public.quotes WHERE unique_id IS NULL ORDER BY created_at
  LOOP
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
         SET unique_id = public.next_structured_id(CASE WHEN v_is_invoice THEN 'IN' ELSE 'QT' END)
       WHERE id = r.id;
    END;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Uniqueness, once backfilled
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS accounts_unique_id_key ON public.accounts (unique_id);
CREATE UNIQUE INDEX IF NOT EXISTS opportunities_unique_id_key ON public.opportunities (unique_id);
CREATE UNIQUE INDEX IF NOT EXISTS tasks_unique_id_key ON public.tasks (unique_id);
CREATE UNIQUE INDEX IF NOT EXISTS quotes_unique_id_key ON public.quotes (unique_id);
