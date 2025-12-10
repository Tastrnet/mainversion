-- Optimize RLS policy performance by wrapping auth.uid() in a subquery
-- This prevents auth.uid() from being re-evaluated for each row
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- Optimize UPDATE policy: Restaurant owners can update their own restaurant
-- This policy likely checks if the restaurant's user_id matches the authenticated user
DROP POLICY IF EXISTS "Restaurant owners can update their own restaurant" ON public.restaurants;

CREATE POLICY "Restaurant owners can update their own restaurant"
ON public.restaurants
FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);






