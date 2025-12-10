-- Update character limits for username and full_name
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_username_check,
DROP CONSTRAINT IF EXISTS profiles_full_name_check;

-- Add new constraints with updated limits
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_check CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
ADD CONSTRAINT profiles_full_name_check CHECK (char_length(full_name) >= 1 AND char_length(full_name) <= 30);