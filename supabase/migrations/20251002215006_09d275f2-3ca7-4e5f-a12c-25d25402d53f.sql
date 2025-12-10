-- Fix the security definer view warning by explicitly setting SECURITY INVOKER
-- This ensures the view uses the querying user's permissions, not the creator's

DROP VIEW IF EXISTS public.public_profiles;

CREATE OR REPLACE VIEW public.public_profiles 
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  username,
  full_name,
  avatar_url,
  bio,
  pinned_restaurants,
  favorites,
  want_to_try,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;