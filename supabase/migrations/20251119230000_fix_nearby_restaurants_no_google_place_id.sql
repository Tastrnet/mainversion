-- Fix get_nearby_restaurants RPC function to remove google_place_id dependency
-- This fixes the error: "column restaurants.google_place_id does not exist"

-- Drop existing function first (handle all possible overloads)
DROP FUNCTION IF EXISTS get_nearby_restaurants(float, float, int, int);
DROP FUNCTION IF EXISTS get_nearby_restaurants(float, float, int, int, text[]);

-- Recreate the function without google_place_id and without relying on geom/PostGIS
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
AS $$
DECLARE
  earth_radius CONSTANT double precision := 6371000; -- meters
  lat_rad double precision := radians(lat);
  lng_rad double precision := radians(lng);
  lat_delta double precision := radius / 111000.0;
  lng_delta double precision := radius / (111000.0 * GREATEST(COS(lat_rad), 0.1));
BEGIN
  IF limit_count IS NULL OR limit_count <= 0 THEN
    RETURN QUERY
    WITH candidate_restaurants AS (
      SELECT r.*
      FROM restaurants r
      WHERE r.latitude IS NOT NULL
        AND r.longitude IS NOT NULL
        -- NOTE: database columns are swapped (latitude column stores longitude values and vice versa)
        -- Swap them here so spatial filtering works with existing data.
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
            POWER(
              SIN(
                (radians(CAST(r.longitude AS double precision)) - lat_rad) / 2
              ),
              2
            ) +
            COS(lat_rad) * COS(radians(CAST(r.longitude AS double precision))) *
            POWER(
              SIN(
                (radians(CAST(r.latitude AS double precision)) - lng_rad) / 2
              ),
              2
            )
          )
        )
      ) AS distance_meters
    FROM candidate_restaurants r
    ORDER BY distance_meters;
  ELSE
    RETURN QUERY
    WITH candidate_restaurants AS (
      SELECT r.*
      FROM restaurants r
      WHERE r.latitude IS NOT NULL
        AND r.longitude IS NOT NULL
        -- NOTE: database columns are swapped (latitude column stores longitude values and vice versa)
        -- Swap them here so spatial filtering works with existing data.
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
            POWER(
              SIN(
                (radians(CAST(r.longitude AS double precision)) - lat_rad) / 2
              ),
              2
            ) +
            COS(lat_rad) * COS(radians(CAST(r.longitude AS double precision))) *
            POWER(
              SIN(
                (radians(CAST(r.latitude AS double precision)) - lng_rad) / 2
              ),
              2
            )
          )
        )
      ) AS distance_meters
    FROM candidate_restaurants r
    ORDER BY distance_meters
    LIMIT limit_count;
  END IF;
END;
$$;

-- Verify indexes exist (recreate if missing)
CREATE INDEX IF NOT EXISTS idx_restaurants_latitude ON restaurants (latitude);
CREATE INDEX IF NOT EXISTS idx_restaurants_longitude ON restaurants (longitude);


