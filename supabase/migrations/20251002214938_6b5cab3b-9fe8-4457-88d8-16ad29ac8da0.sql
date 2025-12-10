-- Fix: Restrict profile access to protect sensitive personal information
-- Create a view for public profile data and update RLS policies

-- Step 1: Update RLS on profiles table to restrict full access to own profile only
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Users can only see their OWN complete profile with all sensitive fields
CREATE POLICY "Users can view their own complete profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Step 2: Create a view that exposes only non-sensitive public profile fields
CREATE OR REPLACE VIEW public.public_profiles AS
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

-- Step 3: Grant SELECT on the public view to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Note: Sensitive fields that are now protected:
-- - birth_year, gender (personal information)
-- - email_notifications, push_notifications (private notification settings)
-- - show_activity, allow_friend_requests (privacy preferences)
-- - is_banned, role (internal system fields)
-- - updated_at (not needed for public viewing)