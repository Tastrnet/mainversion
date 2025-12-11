-- Fix stack depth limit exceeded error
-- Problem: Function overloads causing recursion or complex logic causing stack overflow
-- Solution: Simple, single function with straightforward logic using actual restaurants table

-- Drop ALL existing function overloads completely to avoid any conflicts
DROP FUNCTION IF EXISTS get_nearby_restaurants CASCADE;

-- Create a SINGLE, simple function that uses actual restaurants table columns
-- No overloads, no recursion, just direct query
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
  earth_radius CONSTANT double precision := 6371000; -- meters
  lat_rad double precision;
  lng_rad double precision;
  lat_delta double precision;
  lng_delta double precision;
  result_limit int;
BEGIN
  -- Validate inputs
  IF lat IS NULL OR lng IS NULL OR radius IS NULL OR radius <= 0 THEN
    RETURN;
  END IF;

  -- Set default limit
  result_limit := COALESCE(limit_count, 20);
  IF result_limit <= 0 OR result_limit > 1000 THEN
    result_limit := 20;
  END IF;

  -- Convert to radians
  lat_rad := radians(lat);
  lng_rad := radians(lng);
  
  -- Calculate bounding box (1 degree ≈ 111km) for initial filtering
  lat_delta := radius::double precision / 111000.0;
  lng_delta := radius::double precision / (111000.0 * GREATEST(COS(lat_rad), 0.1));

  -- Simple, direct query using restaurants table
  -- Use actual column names: id is TEXT, latitude/longitude are NUMERIC
  -- Use CTE to calculate distance once, then filter and sort
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
      -- Calculate distance using Haversine formula
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
      -- Bounding box filter for performance (avoids calculating distance for all rows)
      AND r.latitude::double precision BETWEEN lat - lat_delta AND lat + lat_delta
      AND r.longitude::double precision BETWEEN lng - lng_delta AND lng + lng_delta
      -- Cuisine filter (if provided)
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

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_nearby_restaurants(double precision, double precision, int, int, text[]) TO anon, authenticated;

