-- Combine multiple permissive SELECT policies on profiles table into a single policy
-- This improves performance by reducing the number of policies that need to be evaluated
-- Also optimizes auth.uid() call by wrapping it in a subquery

-- Drop the existing separate SELECT policies
DROP POLICY IF EXISTS "Users can view public profile data of others" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own complete profile" ON public.profiles;

-- Create a single combined SELECT policy
-- This combines:
-- 1. Users can view public profile data of others (true - allows viewing all profiles)
-- 2. Users can view their own complete profile (auth.uid() = user_id)
-- Since true OR anything = true, this simplifies to allowing all authenticated users to view all profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);






