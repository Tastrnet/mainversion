-- Optimize RLS policy performance by wrapping auth.uid() in subqueries
-- This prevents auth.uid() from being re-evaluated for each row
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- Optimize SELECT policy: Users can view their own complete profile
DROP POLICY IF EXISTS "Users can view their own complete profile" ON public.profiles;

CREATE POLICY "Users can view their own complete profile"
ON public.profiles
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

-- Optimize UPDATE policy: Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING ((select auth.uid()) = user_id);

-- Optimize INSERT policy: Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);






