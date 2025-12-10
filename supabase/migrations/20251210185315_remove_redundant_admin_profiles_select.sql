-- Remove redundant admin SELECT policy on profiles table
-- "Users can view all profiles" already allows all authenticated users (including admins) to view all profiles
-- Any separate admin SELECT policy is redundant

-- Drop any admin-specific SELECT policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Ensure we have the single SELECT policy that covers everyone
-- This policy already exists from a previous migration, but we'll ensure it's the only SELECT policy
-- If "Users can view all profiles" doesn't exist, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can view all profiles'
  ) THEN
    CREATE POLICY "Users can view all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Note: INSERT is handled by "Users can insert their own profile, admins can insert any"
-- UPDATE is handled by "Users can update their own profile, admins can update any"
-- DELETE is handled by "Admins can delete profiles" (separate policy)
-- No need to recreate admin policies here as they're already handled by combined policies






