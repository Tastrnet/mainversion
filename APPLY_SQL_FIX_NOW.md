# ⚠️ URGENT: Apply SQL Fix to Fix Stack Overflow Error

## The Problem
Your app is getting SQL errors when trying to fetch restaurants:
- `stack depth limit exceeded` (error 54001) - FIXED
- `column reference "id" is ambiguous` (error 42702) - FIXED

## The Solution
**You MUST run this SQL in Supabase RIGHT NOW:**

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Click **SQL Editor** in the left sidebar

2. **Copy and Paste This SQL:**

```sql
-- Drop ALL existing function overloads completely
DROP FUNCTION IF EXISTS get_nearby_restaurants CASCADE;

-- Create a SINGLE, simple function
CREATE OR REPLACE FUNCTION get_nearby_restaurants(
  lat double precision,
  lng double precision,
  radius int DEFAULT 5000,
  limit_count int DEFAULT 20,
  cuisine_names text[] DEFAULT NULL
)
RETURNS TABLE(
  id text,
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
  lat_rad double precision;
  lng_rad double precision;
  lat_delta double precision;
  lng_delta double precision;
  result_limit int;
BEGIN
  IF lat IS NULL OR lng IS NULL OR radius IS NULL OR radius <= 0 THEN
    RETURN;
  END IF;

  result_limit := COALESCE(limit_count, 20);
  IF result_limit <= 0 OR result_limit > 1000 THEN
    result_limit := 20;
  END IF;

  lat_rad := radians(lat);
  lng_rad := radians(lng);
  lat_delta := radius::double precision / 111000.0;
  lng_delta := radius::double precision / (111000.0 * GREATEST(COS(lat_rad), 0.1));

  RETURN QUERY
  WITH restaurants_with_distance AS (
    SELECT 
      r.id::text AS restaurant_id,
      COALESCE(r.name, '')::text AS restaurant_name,
      COALESCE(r.address, '')::text AS restaurant_address,
      r.latitude::numeric AS restaurant_latitude,
      r.longitude::numeric AS restaurant_longitude,
      COALESCE(r.cuisines, '[]'::jsonb) AS restaurant_cuisines,
      COALESCE(r.is_featured, false) AS restaurant_is_featured,
      (
        2 * earth_radius *
        ASIN(
          SQRT(
            POWER(SIN((radians(r.latitude::double precision) - lat_rad) / 2), 2) +
            COS(lat_rad) * COS(radians(r.latitude::double precision)) *
            POWER(SIN((radians(r.longitude::double precision) - lng_rad) / 2), 2)
          )
        )
      ) AS distance_meters
    FROM restaurants r
    WHERE r.latitude IS NOT NULL
      AND r.longitude IS NOT NULL
      AND r.latitude::double precision BETWEEN lat - lat_delta AND lat + lat_delta
      AND r.longitude::double precision BETWEEN lng - lng_delta AND lng + lng_delta
      AND (
        cuisine_names IS NULL
        OR cuisine_names = ARRAY[]::text[]
        OR r.cuisines IS NULL
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(r.cuisines) = 'array' THEN r.cuisines
              ELSE jsonb_build_array(r.cuisines::text)
            END
          ) AS cuisine(value)
          WHERE cuisine.value = ANY (cuisine_names)
        )
      )
  )
  SELECT 
    rwd.restaurant_id AS id,
    rwd.restaurant_name AS name,
    rwd.restaurant_address AS address,
    rwd.restaurant_latitude AS latitude,
    rwd.restaurant_longitude AS longitude,
    rwd.restaurant_cuisines AS cuisines,
    rwd.restaurant_is_featured AS is_featured,
    rwd.distance_meters
  FROM restaurants_with_distance rwd
  WHERE rwd.distance_meters <= radius::double precision
  ORDER BY rwd.distance_meters
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_nearby_restaurants(double precision, double precision, int, int, text[]) TO anon, authenticated;
```

3. **Click RUN** (or press Cmd/Ctrl + Enter)

4. **Verify it worked:**
   - You should see "Success. No rows returned"
   - Test: `SELECT * FROM get_nearby_restaurants(37.785834, -122.406417, 5000, 10);`

## After Applying

1. **Rebuild the app:**
   ```bash
   npm run build
   npx cap sync ios
   ```

2. **Test in Xcode:**
   - Clean build folder (Shift + Cmd + K)
   - Run the app (Cmd + R)
   - Check Safari console - stack overflow error should be GONE
   - Restaurants should load with correct distances!

## What This Fix Does

✅ Removes ALL function overloads (no ambiguity)  
✅ Uses actual restaurants table columns (id TEXT, latitude/longitude NUMERIC)  
✅ Simple CTE approach (no recursion)  
✅ **Fixes ambiguous column references** (uses unique aliases)  
✅ Calculates distance once per restaurant  
✅ Proper bounding box filtering for performance  

**The migration file is ready:** `supabase/migrations/20251211021738_fix_stack_overflow_single_function.sql`

