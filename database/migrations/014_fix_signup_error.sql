-- 1. Create the profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  role TEXT DEFAULT 'user',
  company_name TEXT,
  company_type TEXT DEFAULT 'B2B',
  phone TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Drop any and ALL potential old triggers from past versions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS user_profile_trigger ON auth.users;

-- 3. Replace the function with a completely safe version
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- We wrap this in an exception block so that even if the profile creation fails, 
  -- the user account is still successfully created without throwing the "Database error"
  BEGIN
    INSERT INTO public.profiles (id, name, role, company_name, company_type)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'name', 'Unknown User'),
      COALESCE(new.raw_user_meta_data->>'role', 'user'),
      new.raw_user_meta_data->>'companyName',
      COALESCE(new.raw_user_meta_data->>'companyType', 'B2B')
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignore the error instead of blocking the signup
    RAISE NOTICE 'Failed to create profile for user: %', SQLERRM;
  END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-create the trigger cleanly
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Fix permissions just in case
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
