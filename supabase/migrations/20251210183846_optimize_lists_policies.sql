-- Optimize RLS policy performance by wrapping auth.uid() in subqueries
-- This prevents auth.uid() from being re-evaluated for each row
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- Optimize INSERT policy: Users can create their own lists
DROP POLICY IF EXISTS "Users can create their own lists" ON public.lists;

CREATE POLICY "Users can create their own lists"
ON public.lists
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

-- Optimize UPDATE policy: Users can update their own lists
DROP POLICY IF EXISTS "Users can update their own lists" ON public.lists;

CREATE POLICY "Users can update their own lists"
ON public.lists
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id);

-- Optimize DELETE policy: Users can delete their own lists
DROP POLICY IF EXISTS "Users can delete their own lists" ON public.lists;

CREATE POLICY "Users can delete their own lists"
ON public.lists
FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);






