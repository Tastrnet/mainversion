-- Combine multiple permissive INSERT policies on reviews table into a single policy
-- This improves performance by reducing the number of policies that need to be evaluated

-- Drop the existing separate INSERT policies
DROP POLICY IF EXISTS "Users can create their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Banned users cannot create reviews" ON public.reviews;

-- Create a single combined INSERT policy that checks both conditions
-- This combines:
-- 1. Users can only create reviews for themselves (auth.uid() = user_id)
-- 2. Banned users cannot create reviews (NOT EXISTS banned check)
CREATE POLICY "Users can create their own reviews if not banned"
ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND is_banned = true
  )
);






