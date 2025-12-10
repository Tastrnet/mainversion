-- Update the handle_new_user function to properly handle main app context
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Determine role based on app_context
  DECLARE
    user_role text := 'user'; -- default for main app
  BEGIN
    -- Set role based on app context
    IF NEW.raw_user_meta_data ->> 'app_context' = 'restaurant_app' THEN
      user_role := 'unverified_restaurant';
    ELSIF NEW.raw_user_meta_data ->> 'app_context' = 'main_app' OR NEW.raw_user_meta_data ->> 'app_context' IS NULL THEN
      user_role := 'user';
    END IF;
  END;

  -- Insert profile with role
  INSERT INTO public.profiles (
    user_id, 
    username, 
    full_name, 
    birth_year, 
    gender,
    role
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
    (NEW.raw_user_meta_data ->> 'birth_year')::integer,
    NEW.raw_user_meta_data ->> 'gender',
    user_role
  );

  RETURN NEW;
END;
$$;