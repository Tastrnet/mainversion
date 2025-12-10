-- Fix: Secure restaurant_verification_applications to prevent contact info harvesting
-- Add user_id to track who submitted the application, then restrict access properly

-- Step 1: Add user_id column to track the applicant
ALTER TABLE public.restaurant_verification_applications
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Drop the overly permissive policy that allows anyone to view applications
DROP POLICY IF EXISTS "Users can view their own verification applications" ON public.restaurant_verification_applications;

-- Step 3: Create proper policies with applicant tracking

-- Only the applicant can view their own application
CREATE POLICY "Applicants can view their own verification applications"
ON public.restaurant_verification_applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all verification applications
-- (This policy already exists, keeping it for reference)

-- Step 4: Update INSERT policy to require user_id matches authenticated user
DROP POLICY IF EXISTS "Users can create their own verification applications" ON public.restaurant_verification_applications;

CREATE POLICY "Users can create verification applications"
ON public.restaurant_verification_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Note: Now business contact information (contact_email, contact_phone, business_registration_number)
-- is only visible to:
-- 1. The applicant who submitted it
-- 2. Admins who need to review it