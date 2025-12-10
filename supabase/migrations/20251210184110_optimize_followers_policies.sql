-- Optimize RLS policy performance by wrapping auth.uid() in a subquery
-- This prevents auth.uid() from being re-evaluated for each row
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- Optimize DELETE policy: Users can unfollow others
-- This policy likely checks that the authenticated user is the follower
DROP POLICY IF EXISTS "Users can unfollow others" ON public.followers;

CREATE POLICY "Users can unfollow others"
ON public.followers
FOR DELETE
TO authenticated
USING ((select auth.uid()) = follower_id);

-- Also optimize any other policies on followers table for consistency
-- Check for and optimize INSERT policy if it exists
DROP POLICY IF EXISTS "Users can follow others" ON public.followers;

CREATE POLICY "Users can follow others"
ON public.followers
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = follower_id);






