-- Optimize activities SELECT policy to prevent auth.uid() re-evaluation per row
DROP POLICY IF EXISTS "Users can view activities of people they follow" ON public.activities;

CREATE POLICY "Users can view activities of people they follow"
ON public.activities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.followers
    WHERE follower_id = (select auth.uid())
    AND following_id = activities.user_id
  )
  OR user_id = (select auth.uid())
);






