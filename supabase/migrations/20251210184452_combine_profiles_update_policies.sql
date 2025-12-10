-- Combine multiple permissive UPDATE policies on profiles table into a single policy
-- This improves performance by reducing the number of policies that need to be evaluated
-- Also optimizes auth.uid() call by wrapping it in a subquery

-- Drop the existing separate UPDATE policies
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin interface updates" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Drop the "Admins can manage all profiles" policy (FOR ALL includes UPDATE)
-- We'll recreate it for other operations separately
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Create a single combined UPDATE policy
-- This combines:
-- 1. Admins can update any profile (public.is_admin())
-- 2. Users can update their own profile ((select auth.uid()) = user_id)
-- Also optimizes auth.uid() by wrapping it in a subquery
CREATE POLICY "Users can update their own profile, admins can update any"
ON public.profiles
FOR UPDATE
USING (
  public.is_admin() 
  OR (select auth.uid()) = user_id
)
WITH CHECK (
  public.is_admin() 
  OR (select auth.uid()) = user_id
);

-- Recreate admin management policy for DELETE only (not INSERT, UPDATE, or SELECT)
-- INSERT is handled by the combined "Users can insert their own profile, admins can insert any" policy
-- UPDATE is handled by the combined "Users can update their own profile, admins can update any" policy
-- SELECT is already covered by "Users can view all profiles" policy (USING true)
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (public.is_admin());






