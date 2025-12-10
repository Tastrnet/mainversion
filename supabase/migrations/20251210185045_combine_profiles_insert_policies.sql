-- Combine multiple permissive INSERT policies on profiles table into a single policy
-- This improves performance by reducing the number of policies that need to be evaluated
-- Combines:
-- 1. Admins can insert profiles (public.is_admin())
-- 2. Users can insert their own profile ((select auth.uid()) = user_id)

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile, admins can insert any"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin() 
  OR (select auth.uid()) = user_id
);






