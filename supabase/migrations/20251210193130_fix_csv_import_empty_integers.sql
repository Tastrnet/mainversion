-- Fix CSV import issue: Handle empty strings for integer columns
-- Error: "invalid input syntax for type integer: """
--
-- PostgreSQL doesn't allow empty strings ("") in integer columns. Supabase CSV import
-- directly inserts into tables, bypassing triggers/views, so we need a different approach.

-- Step 1: Drop any problematic functions from previous attempts
DROP FUNCTION IF EXISTS public.handle_empty_strings_for_integers() CASCADE;
DROP FUNCTION IF EXISTS public.import_restaurant_from_csv(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, JSONB) CASCADE;
DROP VIEW IF EXISTS public.restaurants_import CASCADE;

-- Step 2: Ensure id column has auto-increment default if it's integer type
DO $$
DECLARE
  v_id_type TEXT;
  v_column_default TEXT;
  v_max_id INTEGER;
BEGIN
  -- Get the id column information
  SELECT 
    data_type,
    column_default
  INTO 
    v_id_type,
    v_column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'restaurants'
    AND column_name = 'id';
  
  -- If id is integer type without a default sequence, create one
  IF v_id_type = 'integer' AND (v_column_default IS NULL OR v_column_default NOT LIKE '%nextval%') THEN
    -- Create sequence if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_sequences 
      WHERE schemaname = 'public' 
      AND sequencename = 'restaurants_id_seq'
    ) THEN
      CREATE SEQUENCE public.restaurants_id_seq;
      
      -- Set sequence to start from max id + 1
      SELECT COALESCE(MAX(id), 0) INTO v_max_id FROM public.restaurants;
      PERFORM setval('public.restaurants_id_seq', GREATEST(v_max_id, 0) + 1, false);
      
      RAISE NOTICE 'Created sequence restaurants_id_seq';
    END IF;
    
    -- Set the default (even if sequence already existed)
    ALTER TABLE public.restaurants 
    ALTER COLUMN id SET DEFAULT nextval('public.restaurants_id_seq');
    
    RAISE NOTICE 'Set sequence as default for restaurants.id column';
  ELSIF v_id_type != 'integer' THEN
    RAISE NOTICE 'Restaurants.id is type %, not integer - no sequence needed', v_id_type;
  ELSE
    RAISE NOTICE 'Restaurants.id already has a default sequence';
  END IF;
END $$;

-- Step 3: Create a staging table for CSV imports (all columns as TEXT to accept anything)
-- This allows importing CSV with empty strings, then cleaning and moving to main table
CREATE TABLE IF NOT EXISTS public.restaurants_staging (
  id TEXT,
  name TEXT,
  address TEXT,
  latitude TEXT,
  longitude TEXT,
  cuisine_type TEXT,
  image_url TEXT,
  google_place_id TEXT,
  is_featured TEXT,
  description TEXT,
  phone TEXT,
  website TEXT,
  cuisines TEXT,
  created_at TEXT,
  updated_at TEXT,
  "Full Adress" TEXT,
  "Google Place ID" TEXT,
  Latitud TEXT,
  Longitud TEXT,
  Namn TEXT,
  Län TEXT,
  Sökt_Typ TEXT
);

-- Step 4: Create function to clean and import from staging table (with proper security)
CREATE OR REPLACE FUNCTION public.import_restaurants_from_staging()
RETURNS TABLE(imported_count INTEGER, error_count INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_imported INTEGER := 0;
  v_errors INTEGER := 0;
  v_id_value INTEGER;
  v_latitude NUMERIC;
  v_longitude NUMERIC;
  v_is_featured BOOLEAN;
BEGIN
  FOR v_row IN SELECT * FROM public.restaurants_staging LOOP
    BEGIN
      -- Convert id: empty string or NULL -> use default
      IF v_row.id IS NULL OR v_row.id = '' OR v_row.id = '""' THEN
        v_id_value := NULL; -- Will use default sequence
      ELSE
        BEGIN
          v_id_value := v_row.id::INTEGER;
        EXCEPTION WHEN OTHERS THEN
          v_id_value := NULL; -- Invalid, use default
        END;
      END IF;
      
      -- Convert latitude
      IF v_row.latitude IS NULL OR v_row.latitude = '' OR v_row.latitude = '""' THEN
        v_latitude := NULL;
      ELSE
        BEGIN
          v_latitude := NULLIF(v_row.latitude, '')::NUMERIC;
        EXCEPTION WHEN OTHERS THEN
          v_latitude := NULL;
        END;
      END IF;
      
      -- Convert longitude
      IF v_row.longitude IS NULL OR v_row.longitude = '' OR v_row.longitude = '""' THEN
        v_longitude := NULL;
      ELSE
        BEGIN
          v_longitude := NULLIF(v_row.longitude, '')::NUMERIC;
        EXCEPTION WHEN OTHERS THEN
          v_longitude := NULL;
        END;
      END IF;
      
      -- Convert is_featured
      IF v_row.is_featured IS NULL OR v_row.is_featured = '' OR v_row.is_featured = '""' THEN
        v_is_featured := FALSE;
      ELSE
        v_is_featured := LOWER(TRIM(v_row.is_featured)) IN ('true', 't', '1', 'yes');
      END IF;
      
      -- Insert into restaurants table
      INSERT INTO public.restaurants (
        id,
        name,
        address,
        latitude,
        longitude,
        cuisine_type,
        image_url,
        google_place_id,
        is_featured,
        description,
        phone,
        website,
        cuisines
      )
      VALUES (
        v_id_value,
        NULLIF(TRIM(v_row.name), ''),
        NULLIF(TRIM(v_row.address), ''),
        v_latitude,
        v_longitude,
        NULLIF(TRIM(v_row.cuisine_type), ''),
        NULLIF(TRIM(v_row.image_url), ''),
        NULLIF(TRIM(v_row.google_place_id), ''),
        v_is_featured,
        NULLIF(TRIM(v_row.description), ''),
        NULLIF(TRIM(v_row.phone), ''),
        NULLIF(TRIM(v_row.website), ''),
        CASE 
          WHEN v_row.cuisines IS NULL OR v_row.cuisines = '' OR v_row.cuisines = '""' THEN NULL
          ELSE v_row.cuisines::JSONB
        END
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        updated_at = now();
      
      v_imported := v_imported + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING 'Error importing row: %', SQLERRM;
    END;
  END LOOP;
  
  -- Clear staging table after successful import
  DELETE FROM public.restaurants_staging;
  
  RETURN QUERY SELECT v_imported, v_errors;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.import_restaurants_from_staging() TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_restaurants_from_staging() TO anon;

-- IMPORTANT: How to use this for CSV import
-- 
-- Since Supabase CSV import directly inserts into tables and rejects empty strings
-- in integer columns, use this staging table approach:
--
-- METHOD 1: Import CSV into staging table, then clean and import
--   1. In Supabase Dashboard, go to Table Editor
--   2. Import your CSV into the "restaurants_staging" table (all columns are TEXT, so it will accept anything)
--   3. Run this SQL in SQL Editor:
--      SELECT * FROM public.import_restaurants_from_staging();
--   4. This will clean the data and move it to the restaurants table
--
-- METHOD 2: Fix your CSV file first (Recommended)
--   - Remove the 'id' column entirely if it has empty values (database will auto-generate)
--   - Replace all "" in integer/numeric columns with NULL or remove those values
--   - Then import directly into restaurants table
--
-- METHOD 3: Use SQL import
--   INSERT INTO restaurants (name, address, latitude, longitude, ...)
--   VALUES ('Name', 'Address', 55.6, 13.0, ...), ...;

COMMENT ON TABLE public.restaurants_staging IS 
'Staging table for CSV imports. All columns are TEXT to accept empty strings. Use import_restaurants_from_staging() to clean and import data.';

COMMENT ON FUNCTION public.import_restaurants_from_staging() IS 
'Safely imports data from restaurants_staging table, converting empty strings to NULL for integer/numeric columns. Returns count of imported and error rows.';




