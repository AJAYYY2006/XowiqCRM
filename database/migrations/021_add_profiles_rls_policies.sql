-- Migration: 021_add_profiles_rls_policies.sql
-- Description: Enable RLS and add policies for public.profiles to allow reading and updating profiles

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Authenticated users can view profiles
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated users to read profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 2. UPDATE: Users can update their own profile and admins can update team profiles
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
CREATE POLICY "Allow users to update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id 
  OR created_by_admin_id = auth.uid() 
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'administrator')
  )
)
WITH CHECK (
  auth.uid() = id 
  OR created_by_admin_id = auth.uid() 
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'administrator')
  )
);

-- 3. INSERT: Users can insert their own profile or admins can insert
DROP POLICY IF EXISTS "Allow insert to profiles" ON public.profiles;
CREATE POLICY "Allow insert to profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'administrator')
  )
);

-- 4. DELETE: Admins can delete profiles
DROP POLICY IF EXISTS "Allow delete from profiles" ON public.profiles;
CREATE POLICY "Allow delete from profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (
  created_by_admin_id = auth.uid() 
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'administrator')
  )
);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
