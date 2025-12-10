-- Fix: Restrict profile visibility to authenticated users only
-- This prevents public scraping of sensitive user data (birth_year, gender, preferences, etc.)

-- Drop the overly permissive policy that allows anyone on the internet to view profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Add policy requiring authentication to view profiles
-- This protects sensitive data while maintaining social features for logged-in users
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Note: This maintains all social features (viewing other users' profiles, followers, etc.)
-- but requires users to be logged in, preventing public data scraping