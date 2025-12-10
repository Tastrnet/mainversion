-- Optimize lists SELECT policy to prevent auth.uid() re-evaluation per row
DROP POLICY IF EXISTS "Users can view their own lists" ON public.lists;

CREATE POLICY "Users can view their own lists" 
ON public.lists FOR SELECT TO authenticated 
USING ((select auth.uid()) = user_id);






