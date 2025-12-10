-- Optimize activities INSERT policy to prevent auth.uid() re-evaluation per row
DROP POLICY IF EXISTS "Users can create their own activities" ON public.activities;

CREATE POLICY "Users can create their own activities"
ON public.activities
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);






