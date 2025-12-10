-- Combine multiple permissive SELECT policies on list_restaurants table into a single policy
-- The "Users can manage their own list restaurants" FOR ALL policy includes SELECT, which overlaps
-- with the "List restaurants inherit list visibility" SELECT policy
-- Solution: Keep the SELECT policy (it already covers both cases) and change ALL to INSERT/UPDATE/DELETE only

-- Drop the ALL policy and recreate it for INSERT/UPDATE/DELETE only (not SELECT)
DROP POLICY IF EXISTS "Users can manage their own list restaurants" ON public.list_restaurants;

-- Create separate policies for INSERT, UPDATE, DELETE (SELECT is already handled by the existing SELECT policy)
CREATE POLICY "Users can insert their own list restaurants"
ON public.list_restaurants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lists 
    WHERE lists.id = list_restaurants.list_id 
    AND lists.user_id = (select auth.uid())
  )
);

CREATE POLICY "Users can update their own list restaurants"
ON public.list_restaurants
FOR UPDATE
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

CREATE POLICY "Users can delete their own list restaurants"
ON public.list_restaurants
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lists 
    WHERE lists.id = list_restaurants.list_id 
    AND lists.user_id = (select auth.uid())
  )
);

-- Note: SELECT is already handled by "List restaurants inherit list visibility" policy
-- which allows viewing if the list is public OR the user owns the list





