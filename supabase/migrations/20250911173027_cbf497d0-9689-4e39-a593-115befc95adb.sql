-- Add pinned_restaurants field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN pinned_restaurants JSONB DEFAULT '[]'::jsonb;

-- Add comment to clarify the difference between favorites and pinned_restaurants
COMMENT ON COLUMN public.profiles.favorites IS 'General favorite restaurants shown in /favorites page';
COMMENT ON COLUMN public.profiles.pinned_restaurants IS 'Up to 4 restaurants pinned to show prominently on user profile';