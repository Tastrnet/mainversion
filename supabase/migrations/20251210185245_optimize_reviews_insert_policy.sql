-- Optimize reviews INSERT policy to prevent auth.uid() re-evaluation per row
DROP POLICY IF EXISTS "Users can create their own reviews if not banned" ON public.reviews;

CREATE POLICY "Users can create their own reviews if not banned"
ON public.reviews
FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = (select auth.uid())
    AND is_banned = true
  )
);






