-- Run this in Supabase SQL Editor to fix users affected by the login metadata-overwrite bug.
-- This restores user_metadata from the profiles table for any user whose companyName was wiped.

-- Step 1: View affected users (those with empty companyName in auth but data in profiles)
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'companyName' AS meta_companyName,
  u.raw_user_meta_data->>'companyType' AS meta_companyType,
  p.company_name AS profile_companyName,
  p.company_type AS profile_companyType
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE (u.raw_user_meta_data->>'companyName' IS NULL OR u.raw_user_meta_data->>'companyName' = '')
  AND p.company_name IS NOT NULL;

-- Step 2: Restore metadata from profiles table for affected users
-- (Run ONLY after reviewing Step 1 results)
UPDATE auth.users u
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
  'companyName', p.company_name,
  'companyType', COALESCE(p.company_type, 'B2B'),
  'name', COALESCE(p.name, raw_user_meta_data->>'name'),
  'role', COALESCE(p.role, 'user')
)
FROM public.profiles p
WHERE p.id = u.id
  AND (u.raw_user_meta_data->>'companyName' IS NULL OR u.raw_user_meta_data->>'companyName' = '')
  AND p.company_name IS NOT NULL;
