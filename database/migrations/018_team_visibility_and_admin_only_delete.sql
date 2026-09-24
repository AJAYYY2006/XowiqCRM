-- ==============================================================================
-- 018_team_visibility_and_admin_only_delete.sql
--
-- Company-wide visibility for users created under a Super Admin, edit rights by
-- role, and admin-only deletes — enforced at the database (RLS) level.
--
--   * A user's "team" is the admin that created them plus everyone else that
--     admin created. The admin's own team is themselves plus their sub-users.
--   * SELECT : any team member can read the whole team's records.
--   * INSERT : any non-viewer can create records owned by themselves.
--   * UPDATE : any non-viewer can update the team's records.
--   * DELETE : only an admin / administrator, and only within their own team.
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper functions
-- ---------------------------------------------------------------------------

-- The admin that owns a given user. Reads the profile first and falls back to the
-- auth sign-up metadata, so users whose profile row was never created still resolve.
-- Returns NULL for a user with no admin (i.e. an admin / tenant owner themselves).
CREATE OR REPLACE FUNCTION public.admin_of(uid uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT COALESCE(p.created_by_admin_id, p.created_by)
       FROM public.profiles p
      WHERE p.id = uid),
    (SELECT COALESCE(
              NULLIF(u.raw_user_meta_data->>'created_by_admin_id', '')::uuid,
              NULLIF(u.raw_user_meta_data->>'created_by', '')::uuid)
       FROM auth.users u
      WHERE u.id = uid)
  );
$$;

-- The tenant owner (admin) id for the current user. An admin resolves to itself.
CREATE OR REPLACE FUNCTION public.team_admin_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.admin_of(auth.uid()), auth.uid());
$$;

-- True when the row owner belongs to the current user's company team.
CREATE OR REPLACE FUNCTION public.same_team(row_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_user_id IS NOT NULL AND (
    row_user_id = auth.uid()
    OR row_user_id = public.team_admin_id()
    OR public.admin_of(row_user_id) = public.team_admin_id()
  );
$$;

-- Everyone except the read-only 'viewer' role may create / update records.
CREATE OR REPLACE FUNCTION public.can_edit_records()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT LOWER(COALESCE(p.role, 'user')) <> 'viewer'
       FROM public.profiles p
      WHERE p.id = auth.uid()),
    true
  );
$$;

-- True when the current user is an admin or administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT LOWER(COALESCE(p.role, 'user')) IN ('admin', 'administrator')
       FROM public.profiles p
      WHERE p.id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.admin_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_admin_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.same_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_records() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- 1b. Allow the B2C Store Owner role (assignable in the UI) in profiles.role,
--     then backfill profile rows for users that signed up but never got one,
--     and fill in a missing admin link from the sign-up metadata.
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY[
    'admin'::text, 'administrator'::text, 'manager'::text, 'agent'::text,
    'user'::text, 'viewer'::text, 'sales_rep'::text, 'support_agent'::text, 'b2c'::text
  ]));

INSERT INTO public.profiles (id, name, email, role, company_name, company_type, created_by, created_by_admin_id)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.email,
  COALESCE(NULLIF(u.raw_user_meta_data->>'role', ''), 'user'),
  NULLIF(u.raw_user_meta_data->>'companyName', ''),
  NULLIF(u.raw_user_meta_data->>'companyType', ''),
  NULLIF(u.raw_user_meta_data->>'created_by', '')::uuid,
  NULLIF(u.raw_user_meta_data->>'created_by_admin_id', '')::uuid
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

UPDATE public.profiles p
   SET created_by_admin_id = NULLIF(u.raw_user_meta_data->>'created_by_admin_id', '')::uuid
  FROM auth.users u
 WHERE u.id = p.id
   AND p.created_by_admin_id IS NULL
   AND NULLIF(u.raw_user_meta_data->>'created_by_admin_id', '') IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Drop the old per-user / admin-only policies
-- ---------------------------------------------------------------------------

-- accounts
DROP POLICY IF EXISTS "Accounts manage policy"               ON public.accounts;
DROP POLICY IF EXISTS "Users can manage their own accounts"  ON public.accounts;
DROP POLICY IF EXISTS "admin_read_team_accounts"             ON public.accounts;
DROP POLICY IF EXISTS "Admins can delete accounts"           ON public.accounts;

-- activities
DROP POLICY IF EXISTS "Users can manage their own activities" ON public.activities;
DROP POLICY IF EXISTS "admin_read_team_activities"            ON public.activities;
DROP POLICY IF EXISTS "Admins can delete activities"          ON public.activities;

-- contacts
DROP POLICY IF EXISTS "Users can manage their own contacts"  ON public.contacts;
DROP POLICY IF EXISTS "admin_read_team_contacts"             ON public.contacts;
DROP POLICY IF EXISTS "Admins can delete contacts"           ON public.contacts;

-- customer_services
DROP POLICY IF EXISTS "Users can manage own customer_services"  ON public.customer_services;
DROP POLICY IF EXISTS "Users can manage their client visits"    ON public.customer_services;
DROP POLICY IF EXISTS "admin_read_team_services"                ON public.customer_services;

-- invoices
DROP POLICY IF EXISTS "Users can manage their own invoices"  ON public.invoices;
DROP POLICY IF EXISTS "Admins can delete invoices"           ON public.invoices;

-- leads
DROP POLICY IF EXISTS "Leads manage policy"                  ON public.leads;
DROP POLICY IF EXISTS "Users can manage their own leads"     ON public.leads;
DROP POLICY IF EXISTS "admin_read_team_leads"                ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads"              ON public.leads;

-- opportunities
DROP POLICY IF EXISTS "Users can manage their own opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "admin_read_team_opportunities"            ON public.opportunities;
DROP POLICY IF EXISTS "Admins can delete opportunities"          ON public.opportunities;

-- quotes
DROP POLICY IF EXISTS "Users can manage own quotes"          ON public.quotes;
DROP POLICY IF EXISTS "Users can manage their own quotes"    ON public.quotes;
DROP POLICY IF EXISTS "admin_read_team_quotes"               ON public.quotes;
DROP POLICY IF EXISTS "Admins can delete quotes"             ON public.quotes;

-- services
DROP POLICY IF EXISTS "Users can manage own services"        ON public.services;
DROP POLICY IF EXISTS "Users can manage their own services"  ON public.services;

-- tasks
DROP POLICY IF EXISTS "Tasks manage policy"                  ON public.tasks;
DROP POLICY IF EXISTS "Users can manage their own tasks"     ON public.tasks;
DROP POLICY IF EXISTS "admin_read_team_tasks"                ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete tasks"              ON public.tasks;

-- tickets
DROP POLICY IF EXISTS "Users can manage their own tickets"   ON public.tickets;
DROP POLICY IF EXISTS "admin_read_team_tickets"              ON public.tickets;
DROP POLICY IF EXISTS "Admins can delete tickets"            ON public.tickets;

-- ---------------------------------------------------------------------------
-- 3. Team policies, one set per table
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'accounts', 'activities', 'contacts', 'customer_services', 'invoices',
    'leads', 'opportunities', 'quotes', 'services', 'tasks', 'tickets'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format('DROP POLICY IF EXISTS team_select_%1$s ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS team_insert_%1$s ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS team_update_%1$s ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS admin_delete_%1$s ON public.%1$I', tbl);

    -- Read: the whole company team
    EXECUTE format(
      'CREATE POLICY team_select_%1$s ON public.%1$I FOR SELECT TO authenticated
         USING (public.same_team(user_id))', tbl);

    -- Create: own records, any non-viewer role
    EXECUTE format(
      'CREATE POLICY team_insert_%1$s ON public.%1$I FOR INSERT TO authenticated
         WITH CHECK (auth.uid() = user_id AND public.can_edit_records())', tbl);

    -- Update: team records, any non-viewer role (ownership cannot be moved outside the team)
    EXECUTE format(
      'CREATE POLICY team_update_%1$s ON public.%1$I FOR UPDATE TO authenticated
         USING (public.same_team(user_id) AND public.can_edit_records())
         WITH CHECK (public.same_team(user_id) AND public.can_edit_records())', tbl);

    -- Delete: admins only, and only inside their own team
    EXECUTE format(
      'CREATE POLICY admin_delete_%1$s ON public.%1$I FOR DELETE TO authenticated
         USING (public.is_admin() AND public.same_team(user_id))', tbl);
  END LOOP;
END $$;
