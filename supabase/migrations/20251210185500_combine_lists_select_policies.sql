-- Combine multiple permissive SELECT policies on lists table into a single policy
-- This improves performance by reducing the number of policies that need to be evaluated
-- Combines:
-- 1. Users can view public lists (is_public = true)
-- 2. Users can view their own lists ((select auth.uid()) = user_id)

DROP POLICY IF EXISTS "Users can view public lists" ON public.lists;
DROP POLICY IF EXISTS "Users can view their own lists" ON public.lists;

CREATE POLICY "Users can view public lists or their own lists"
ON public.lists
FOR SELECT
TO authenticated
USING (
  is_public = true 
  OR (select auth.uid()) = user_id
);





