-- Combine multiple permissive SELECT policies on restaurant_verification_applications table
-- This improves performance by reducing the number of policies that need to be evaluated
-- Also optimizes auth.uid() call by wrapping it in a subquery

-- Drop the existing separate SELECT policies
DROP POLICY IF EXISTS "Admins can view all verification applications" ON public.restaurant_verification_applications;
DROP POLICY IF EXISTS "Applicants can view their own verification applications" ON public.restaurant_verification_applications;

-- Create a single combined SELECT policy
-- This combines:
-- 1. Admins can view all verification applications (public.is_admin())
-- 2. Applicants can view their own verification applications ((select auth.uid()) = user_id)
-- Also optimizes auth.uid() by wrapping it in a subquery
CREATE POLICY "Admins can view all, applicants can view their own verification applications"
ON public.restaurant_verification_applications
FOR SELECT
TO authenticated
USING (
  public.is_admin() 
  OR (select auth.uid()) = user_id
);






