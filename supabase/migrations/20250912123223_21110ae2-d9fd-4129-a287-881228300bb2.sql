-- Add want_to_try field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN want_to_try jsonb DEFAULT '[]'::jsonb;

-- Add index for better performance on want_to_try queries
CREATE INDEX idx_profiles_want_to_try ON public.profiles USING GIN(want_to_try);