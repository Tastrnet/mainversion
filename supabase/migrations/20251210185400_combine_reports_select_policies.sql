-- Combine multiple permissive SELECT policies on reports table into a single policy
-- This improves performance by reducing the number of policies that need to be evaluated
-- Combines:
-- 1. Admins can view all reports (public.is_admin())
-- 2. Users can view their own reports ((select auth.uid()) = reporter_id)

DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;

CREATE POLICY "Admins can view all reports, users can view their own reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin() 
    OR (select auth.uid()) = reporter_id
  );





