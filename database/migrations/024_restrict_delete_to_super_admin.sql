-- ============================================================================
-- 024_restrict_delete_to_super_admin.sql
-- public.is_admin() previously allowed both the 'admin' (Super Admin) and
-- 'administrator' (Admin) roles, and is used exclusively by the
-- admin_delete_<table> RLS policies from
-- 018_team_visibility_and_admin_only_delete.sql. Deletion must be restricted
-- exclusively to Super Admin ('admin'); narrowing this single function
-- re-scopes every one of those delete policies at once.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT LOWER(COALESCE(p.role, 'user')) = 'admin'
       FROM public.profiles p
      WHERE p.id = auth.uid()),
    false
  );
$$;
