-- Optimize reports INSERT policy to prevent auth.uid() re-evaluation per row
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;

CREATE POLICY "Users can create reports"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = reporter_id);






