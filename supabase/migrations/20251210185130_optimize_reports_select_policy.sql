-- Optimize reports SELECT policy to prevent auth.uid() re-evaluation per row
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;

CREATE POLICY "Users can view their own reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = reporter_id);






