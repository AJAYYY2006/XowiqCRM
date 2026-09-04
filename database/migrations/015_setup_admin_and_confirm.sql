-- 1. Correct the after-insert trigger function to match the actual database schema
-- (the profiles table does not have company_name or company_type columns, so trying to insert into them causes a silent failure)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, name, email, role)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'name', 'Unknown User'),
      new.email,
      COALESCE(new.raw_user_meta_data->>'role', 'user')
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to create profile for user: %', SQLERRM;
  END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the before-insert trigger function to automatically confirm all new signups
CREATE OR REPLACE FUNCTION public.handle_new_user_before()
RETURNS trigger AS $$
BEGIN
  new.email_confirmed_at := now();
  new.confirmed_at := now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind the BEFORE INSERT trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_before ON auth.users;
CREATE TRIGGER on_auth_user_created_before
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_before();

-- 4. Confirm any existing unconfirmed accounts in auth.users
UPDATE auth.users
SET email_confirmed_at = now(), confirmed_at = now()
WHERE email_confirmed_at IS NULL;
