-- Add SELECT policies for reviews table to allow viewing reviews

-- Allow users to view all non-hidden reviews (for public viewing)
CREATE POLICY "Users can view non-hidden reviews" 
ON public.reviews 
FOR SELECT 
USING (is_hidden = false);

-- Allow users to view their own reviews (including hidden ones)
CREATE POLICY "Users can view their own reviews" 
ON public.reviews 
FOR SELECT 
USING (auth.uid() = user_id);