# SQL Fix Instructions - Apply to Supabase

## Critical Fix: Function Overload Ambiguity (PGRST203 Error)

**Current Error:** `Could not choose the best candidate function between...` (PGRST203)

This error occurs because PostgREST cannot resolve which function overload to use when parameters have defaults.

**Previous Error:** `column r.google_place_id does not exist` - This is also fixed in the same migration.

### Steps to Fix:

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run the Latest Migration**
   - Copy the entire contents of: `supabase/migrations/20251211020100_fix_function_overload_ambiguity.sql`
   - **OR** use the SQL from `SQL_FIX_FINAL.md` (simpler version)
   - Paste it into the SQL Editor
   - Click **Run** or press Cmd/Ctrl + Enter

3. **Verify the Fix**
   - The function should now work without overload ambiguity
   - Test by running: `SELECT * FROM get_nearby_restaurants(55.604981, 13.003822, 5000, 20);`

### What This Fix Does:

- ✅ Removes all references to `r.google_place_id` column
- ✅ Uses only existing columns: `id`, `name`, `address`, `latitude`, `longitude`, `cuisines`, `is_featured`
- ✅ Calculates distance using Haversine formula (no PostGIS dependency)
- ✅ Handles swapped latitude/longitude columns in database
- ✅ Supports cuisine filtering
- ✅ Maintains backward compatibility with float parameters

### Alternative: Quick SQL Fix

If you prefer to run SQL directly, here's the minimal fix:

```sql
DROP FUNCTION IF EXISTS get_nearby_restaurants(float, float, int, int);
DROP FUNCTION IF EXISTS get_nearby_restaurants(double precision, double precision, int, int);
DROP FUNCTION IF EXISTS get_nearby_restaurants(double precision, double precision, int, int, text[]);

CREATE OR REPLACE FUNCTION get_nearby_restaurants(
  lat double precision,
  lng double precision,
  radius int DEFAULT 5000,
  limit_count int DEFAULT NULL,
  cuisine_names text[] DEFAULT NULL
)
RETURNS TABLE(
  id int,
  name text,
  address text,
  latitude numeric,
  longitude numeric,
  cuisines jsonb,
  is_featured boolean,
  distance_meters double precision
) 
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  earth_radius CONSTANT double precision := 6371000;
  lat_rad double precision := radians(lat);
  lng_rad double precision := radians(lng);
  lat_delta double precision := radius / 111000.0;
  lng_delta double precision := radius / (111000.0 * GREATEST(COS(lat_rad), 0.1));
BEGIN
  RETURN QUERY
  WITH candidate_restaurants AS (
    SELECT r.*
    FROM restaurants r
    WHERE r.latitude IS NOT NULL
      AND r.longitude IS NOT NULL
      AND CAST(r.longitude AS double precision) BETWEEN lat - lat_delta AND lat + lat_delta
      AND CAST(r.latitude AS double precision) BETWEEN lng - lng_delta AND lng + lng_delta
      AND (
        cuisine_names IS NULL
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(
            CASE
              WHEN r.cuisines IS NULL THEN '[]'::jsonb
              WHEN jsonb_typeof(r.cuisines) = 'array' THEN r.cuisines
              ELSE jsonb_build_array(r.cuisines)
            END
          ) AS cuisine(value)
          WHERE cuisine.value = ANY (cuisine_names)
        )
      )
  )
  SELECT 
    r.id,
    COALESCE(r.name, '') AS name,
    COALESCE(r.address, '') AS address,
    r.latitude,
    r.longitude,
    COALESCE(r.cuisines, '[]'::jsonb) AS cuisines,
    COALESCE(r.is_featured, false) AS is_featured,
    (
      2 * earth_radius *
      ASIN(
        SQRT(
          POWER(SIN((radians(CAST(r.longitude AS double precision)) - lat_rad) / 2), 2) +
          COS(lat_rad) * COS(radians(CAST(r.longitude AS double precision))) *
          POWER(SIN((radians(CAST(r.latitude AS double precision)) - lng_rad) / 2), 2)
        )
      )
    ) AS distance_meters
  FROM candidate_restaurants r
  ORDER BY distance_meters
  LIMIT COALESCE(limit_count, 20);
END;
$$;

-- Backward compatibility overload
CREATE OR REPLACE FUNCTION get_nearby_restaurants(
  lat float,
  lng float,
  radius int DEFAULT 5000,
  limit_count int DEFAULT 20
)
RETURNS TABLE(
  id int,
  name text,
  address text,
  latitude numeric,
  longitude numeric,
  cuisines jsonb,
  is_featured boolean,
  distance_meters double precision
) 
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM get_nearby_restaurants(
    lat::double precision,
    lng::double precision,
    radius,
    limit_count,
    NULL::text[]
  );
END;
$$;
```

## Authentication Errors (422/400)

The 422 error on signup and 400 error on token are likely related to:

1. **Birth Year Validation** - The database function `handle_new_user()` validates age. If birth_year is missing or invalid, it will fail.
2. **Data Format** - Ensure birth_year is passed as a number, not a string.

These should be resolved once the SQL function is fixed and the app properly passes birth_year in the signup flow.

