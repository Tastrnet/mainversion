-- Optimize RLS policy performance by wrapping auth.uid() in subqueries
-- This prevents auth.uid() from being re-evaluated for each row
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- Optimize DELETE policy: Users can unlike lists
DROP POLICY IF EXISTS "Users can unlike lists" ON public.list_likes;

CREATE POLICY "Users can unlike lists"
ON public.list_likes
FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

-- Optimize INSERT policy: Users can like lists (for consistency)
DROP POLICY IF EXISTS "Users can like lists" ON public.list_likes;

CREATE POLICY "Users can like lists"
ON public.list_likes
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);






