-- Fix security issue: Drop function with mutable search_path
-- Entity: public.handle_empty_strings_for_integers
-- Issue: Function has a role mutable search_path (security vulnerability)

-- Drop the function with all possible signatures
-- Using CASCADE to also drop any dependent objects (triggers, etc.)
DO $$
DECLARE
  v_func_oid OID;
  v_func_name TEXT;
BEGIN
  -- Find and drop all versions of this function
  FOR v_func_oid, v_func_name IN
    SELECT oid, proname || '(' || pg_get_function_identity_arguments(oid) || ')'
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = 'handle_empty_strings_for_integers'
  LOOP
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', v_func_name);
      RAISE NOTICE 'Dropped function: %', v_func_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not drop function %: %', v_func_name, SQLERRM;
    END;
  END LOOP;
  
  -- Also try dropping without parameters (most common case)
  DROP FUNCTION IF EXISTS public.handle_empty_strings_for_integers() CASCADE;
  
  -- Verify it's gone
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = 'handle_empty_strings_for_integers'
  ) THEN
    RAISE WARNING 'Function handle_empty_strings_for_integers still exists after drop attempt';
  ELSE
    RAISE NOTICE 'Successfully removed function handle_empty_strings_for_integers';
  END IF;
END $$;

-- Also drop any triggers that might reference this function
DROP TRIGGER IF EXISTS trigger_handle_empty_strings_restaurants ON public.restaurants CASCADE;

-- Verify cleanup
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname = 'handle_empty_strings_for_integers';
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Function handle_empty_strings_for_integers still exists. Please check manually.';
  END IF;
END $$;

COMMENT ON SCHEMA public IS 'Security fix: Removed function handle_empty_strings_for_integers with mutable search_path vulnerability.';




