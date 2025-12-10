-- Secure restaurant_verification_applications table with RLS policies
-- This table contains sensitive business information and must be protected

-- Users can submit their own verification applications
CREATE POLICY "Users can create their own verification applications"
ON public.restaurant_verification_applications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can view only their own verification applications
CREATE POLICY "Users can view their own verification applications"
ON public.restaurant_verification_applications
FOR SELECT
TO authenticated
USING (reviewed_by = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles
  WHERE user_id = auth.uid()
));

-- Only admins can view all verification applications
CREATE POLICY "Admins can view all verification applications"
ON public.restaurant_verification_applications
FOR SELECT
TO authenticated
USING (is_admin());

-- Only admins can update verification applications (approve/reject)
CREATE POLICY "Admins can update verification applications"
ON public.restaurant_verification_applications
FOR UPDATE
TO authenticated
USING (is_admin());

-- Only admins can delete verification applications
CREATE POLICY "Admins can delete verification applications"
ON public.restaurant_verification_applications
FOR DELETE
TO authenticated
USING (is_admin());