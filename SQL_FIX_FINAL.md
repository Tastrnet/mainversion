# Final SQL Fix - Function Overload Ambiguity

## Problem
PostgREST error PGRST203: "Could not choose the best candidate function" when calling `get_nearby_restaurants`.

This happens because PostgREST cannot resolve which function overload to use when parameters have defaults.

## Solution

Run this SQL in Supabase SQL Editor to fix the issue:

```sql
-- Drop ALL existing function overloads
DROP FUNCTION IF EXISTS get_nearby_restaurants(float, float, int, int);
DROP FUNCTION IF EXISTS get_nearby_restaurants(float, float, int, int, text[]);
DROP FUNCTION IF EXISTS get_nearby_restaurants(double precision, double precision, int, int);
DROP FUNCTION IF EXISTS get_nearby_restaurants(double precision, double precision, int, int, text[]);

-- Create a SINGLE function with all parameters (including cuisine_names with default NULL)
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

-- Create float overload for backward compatibility
CREATE OR REPLACE FUNCTION get_nearby_restaurants(
  lat float,
  lng float,
  radius int DEFAULT 5000,
  limit_count int DEFAULT 20,
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
BEGIN
  RETURN QUERY
  SELECT * FROM get_nearby_restaurants(
    lat::double precision,
    lng::double precision,
    radius,
    limit_count,
    cuisine_names
  );
END;
$$;
```

## What Changed

1. ✅ Consolidated to a single function signature with all parameters
2. ✅ Always includes `cuisine_names` parameter (with DEFAULT NULL)
3. ✅ Updated TypeScript code to always pass `cuisine_names` explicitly
4. ✅ Removed `google_place_id` references
5. ✅ Maintains backward compatibility with float parameters

## After Applying

1. Rebuild the app: `npm run build && npx cap sync ios`
2. Test in Xcode - restaurants should load without errors
3. Check Safari console - PGRST203 errors should be gone


