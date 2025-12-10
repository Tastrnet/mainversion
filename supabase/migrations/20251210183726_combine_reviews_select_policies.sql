-- Combine multiple permissive SELECT policies on reviews table into a single policy
-- This improves performance by reducing the number of policies that need to be evaluated
-- Also optimizes auth.uid() call by wrapping it in a subquery

-- Drop the existing separate SELECT policies that are causing the issue
DROP POLICY IF EXISTS "Users can view non-hidden reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.reviews;

-- Create a single combined SELECT policy that checks both conditions
-- This combines:
-- 1. Users can view non-hidden reviews (is_hidden = false)
-- 2. Users can view their own reviews (including hidden ones)
-- Also optimizes auth.uid() by wrapping it in a subquery to prevent re-evaluation per row
CREATE POLICY "Users can view non-hidden reviews or their own reviews"
ON public.reviews
FOR SELECT
USING (
  is_hidden = false 
  OR (select auth.uid()) = user_id
);






