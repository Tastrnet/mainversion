-- Add age limit constraint: users must be at least 13 years old
-- This constraint ensures that birth_year is set and the user is at least 13 years old

-- Add check constraint to profiles table
ALTER TABLE public.profiles
ADD CONSTRAINT check_age_13_plus
CHECK (
  birth_year IS NULL OR 
  (EXTRACT(YEAR FROM CURRENT_DATE) - birth_year >= 13)
);

-- Update the handle_new_user function to validate age
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role_value text := 'user';
  restaurant_id_value text := NULL;
  birth_year_value integer;
  current_year integer;
BEGIN
  IF NEW.raw_user_meta_data ->> 'app_context' = 'restaurant_app' THEN
    user_role_value := 'unverified_restaurant';
    restaurant_id_value := NEW.raw_user_meta_data ->> 'restaurant_id';
  ELSIF NEW.raw_user_meta_data ->> 'app_context' = 'admin_app' THEN
    user_role_value := 'admin';
  ELSE
    user_role_value := 'user';
  END IF;

  -- Extract birth year and validate age
  birth_year_value := (NEW.raw_user_meta_data ->> 'birth_year')::integer;
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Validate age for regular users (must be at least 13 and birth_year is required)
  IF user_role_value = 'user' THEN
    IF birth_year_value IS NULL THEN
      RAISE EXCEPTION 'Date of birth is required';
    END IF;
    IF (current_year - birth_year_value) < 13 THEN
      RAISE EXCEPTION 'User must be at least 13 years old to create an account';
    END IF;
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
    birth_year_value,
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

