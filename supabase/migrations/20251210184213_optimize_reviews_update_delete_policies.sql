-- Optimize RLS policy performance by wrapping auth.uid() in subqueries
-- This prevents auth.uid() from being re-evaluated for each row
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- Optimize UPDATE policy: Users can update their own reviews
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;

CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id);

-- Optimize DELETE policy: Users can delete their own reviews (for consistency)
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;

CREATE POLICY "Users can delete their own reviews"
ON public.reviews
FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);






