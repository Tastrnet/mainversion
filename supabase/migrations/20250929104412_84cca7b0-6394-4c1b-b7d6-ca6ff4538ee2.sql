-- Update the handle_new_user function to properly handle main_app context
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role_value text := 'user'; -- default for main app
  restaurant_id_value text := NULL;
BEGIN
  -- Determine role based on app_context
  IF NEW.raw_user_meta_data ->> 'app_context' = 'restaurant_app' THEN
    user_role_value := 'unverified_restaurant';
    restaurant_id_value := NEW.raw_user_meta_data ->> 'restaurant_id';
  ELSIF NEW.raw_user_meta_data ->> 'app_context' = 'admin_app' THEN
    user_role_value := 'admin';
  ELSE
    -- Default to 'user' for main_app or any other context
    user_role_value := 'user';
  END IF;

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
    user_role_value
  );

  -- If this is a restaurant signup and we have a restaurant_id, connect the user to the restaurant
  IF user_role_value = 'unverified_restaurant' AND restaurant_id_value IS NOT NULL THEN
    UPDATE public.restaurants 
    SET user_id = NEW.id 
    WHERE id = restaurant_id_value AND user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$function$;