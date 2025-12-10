-- Combine multiple permissive SELECT policies on cuisines table into a single policy
-- This improves performance by reducing the number of policies that need to be evaluated

-- Step 1: Drop the existing policies
DROP POLICY IF EXISTS "Admins can manage cuisines" ON public.cuisines;
DROP POLICY IF EXISTS "Cuisines are viewable by everyone" ON public.cuisines;

-- Step 2: Create a single combined SELECT policy
-- Admins can see all cuisines (including inactive ones)
-- Regular users can only see active cuisines
CREATE POLICY "Cuisines are viewable by everyone, admins see all"
ON public.cuisines
FOR SELECT
USING (
  public.is_admin() OR is_active = true
);

-- Step 3: Create separate policies for INSERT, UPDATE, DELETE for admins only
-- This allows admins to manage cuisines without creating duplicate SELECT policies
CREATE POLICY "Admins can insert cuisines"
ON public.cuisines
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update cuisines"
ON public.cuisines
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete cuisines"
ON public.cuisines
FOR DELETE
USING (public.is_admin());






