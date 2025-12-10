-- Optimize RLS policy performance by wrapping auth.uid() in a subquery
-- This prevents auth.uid() from being re-evaluated for each row
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- Drop and recreate the SELECT policy with optimized auth.uid() call
DROP POLICY IF EXISTS "Applicants can view their own verification applications" ON public.restaurant_verification_applications;

CREATE POLICY "Applicants can view their own verification applications"
ON public.restaurant_verification_applications
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

-- Also optimize the INSERT policy for consistency and performance
DROP POLICY IF EXISTS "Users can create verification applications" ON public.restaurant_verification_applications;

CREATE POLICY "Users can create verification applications"
ON public.restaurant_verification_applications
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);






