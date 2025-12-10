-- Remove duplicate INSERT policy on profiles table
-- "Users can insert their own profile, admins can insert any" already covers admins
-- The separate "Admins can insert profiles" policy is redundant and causes multiple permissive policies

-- Drop the duplicate policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

-- Ensure the combined policy is restricted to authenticated users only
-- This prevents the policy from being evaluated for anonymous users
DROP POLICY IF EXISTS "Users can insert their own profile, admins can insert any" ON public.profiles;

CREATE POLICY "Users can insert their own profile, admins can insert any"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin() 
  OR (select auth.uid()) = user_id
);





