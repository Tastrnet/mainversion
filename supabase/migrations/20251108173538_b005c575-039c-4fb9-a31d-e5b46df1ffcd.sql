-- Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Update existing profiles with their email addresses
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.user_id = auth.users.id
AND profiles.email IS NULL;

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role_value text := 'user';
  restaurant_id_value text := NULL;
BEGIN
  IF NEW.raw_user_meta_data ->> 'app_context' = 'restaurant_app' THEN
    user_role_value := 'unverified_restaurant';
    restaurant_id_value := NEW.raw_user_meta_data ->> 'restaurant_id';
  ELSIF NEW.raw_user_meta_data ->> 'app_context' = 'admin_app' THEN
    user_role_value := 'admin';
  ELSE
    user_role_value := 'user';
  END IF;

  INSERT INTO public.profiles (
    user_id, 
    username, 
    full_name, 
    birth_year, 
    gender,
    role,
    email
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
    (NEW.raw_user_meta_data ->> 'birth_year')::integer,
    NEW.raw_user_meta_data ->> 'gender',
    user_role_value,
    NEW.email
  );

  IF user_role_value = 'unverified_restaurant' AND restaurant_id_value IS NOT NULL THEN
    UPDATE public.restaurants 
    SET user_id = NEW.id 
    WHERE id = restaurant_id_value AND user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;