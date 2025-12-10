-- Optimize RLS policy performance by wrapping auth.uid() in subqueries
-- This prevents auth.uid() from being re-evaluated for each row
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- Optimize SELECT policy: List restaurants inherit list visibility
DROP POLICY IF EXISTS "List restaurants inherit list visibility" ON public.list_restaurants;

CREATE POLICY "List restaurants inherit list visibility"
ON public.list_restaurants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lists 
    WHERE lists.id = list_restaurants.list_id 
    AND (lists.user_id = (select auth.uid()) OR lists.is_public = true)
  )
);

-- Optimize ALL policy: Users can manage their own list restaurants
-- This policy covers INSERT, UPDATE, DELETE operations
DROP POLICY IF EXISTS "Users can manage their own list restaurants" ON public.list_restaurants;

CREATE POLICY "Users can manage their own list restaurants"
ON public.list_restaurants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lists 
    WHERE lists.id = list_restaurants.list_id 
    AND lists.user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lists 
    WHERE lists.id = list_restaurants.list_id 
    AND lists.user_id = (select auth.uid())
  )
);






