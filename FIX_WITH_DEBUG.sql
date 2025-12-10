-- Improved version with better error handling and type casting
-- This version handles swapped lat/lng columns and type safety

DROP FUNCTION IF EXISTS get_nearby_restaurants(float, float, int, int);

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
  distance_meters float
) 
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  lat_rad float;
  lng_rad float;
  radius_degrees float;
  actual_lat float;
  actual_lng float;
BEGIN
  -- Validate inputs
  IF lat IS NULL OR lng IS NULL OR lat < -90 OR lat > 90 OR lng < -180 OR lng > 180 THEN
    RETURN;
  END IF;

  -- Convert to radians once for efficiency
  lat_rad := radians(lat);
  lng_rad := radians(lng);
  -- Calculate approximate degrees for bounding box
  -- 1 degree latitude ≈ 111km, but we add buffer
  radius_degrees := GREATEST(0.05, radius::float / 110000.0);
  
  RETURN QUERY
  SELECT 
    r.id,
    COALESCE(r.name, '')::text as name,
    COALESCE(r.address, '')::text as address,
    -- SWAPPED: The database has lat/lng columns reversed
    -- Return them in correct order for the API
    r.longitude::numeric AS latitude,  -- Database "longitude" is actually latitude
    r.latitude::numeric AS longitude,  -- Database "latitude" is actually longitude
    COALESCE(r.cuisines, '[]'::jsonb) as cuisines,
    COALESCE(r.is_featured, false) as is_featured,
    -- Calculate distance using Haversine formula
    -- SWAPPED: Use r.longitude for actual latitude, r.latitude for actual longitude
    -- Handle NULL values safely
    CASE 
      WHEN r.latitude IS NULL OR r.longitude IS NULL THEN NULL
      ELSE (
        6371000.0 * acos(
          LEAST(1.0, 
            sin(lat_rad) * sin(radians(r.longitude::float)) +
            cos(lat_rad) * cos(radians(r.longitude::float)) *
            cos(radians(r.latitude::float) - lng_rad)
          )
        )
      )
    END AS distance_meters
  FROM restaurants r
  WHERE r.latitude IS NOT NULL
    AND r.longitude IS NOT NULL
    -- SWAPPED: Check using reversed columns
    -- Database "longitude" (actual lat) should be -90 to 90
    -- Database "latitude" (actual lng) should be -180 to 180
    AND r.longitude::float BETWEEN -90 AND 90
    AND r.latitude::float BETWEEN -180 AND 180
    -- Bounding box with swapped columns (more generous)
    AND r.longitude::float BETWEEN lat - radius_degrees 
                              AND lat + radius_degrees
    AND r.latitude::float BETWEEN lng - (radius_degrees / GREATEST(0.1, abs(cos(lat_rad))))
                             AND lng + (radius_degrees / GREATEST(0.1, abs(cos(lat_rad))))
    -- Accurate distance filter using Haversine formula with swapped columns
    AND 6371000.0 * acos(
      LEAST(1.0,
        sin(lat_rad) * sin(radians(r.longitude::float)) +
        cos(lat_rad) * cos(radians(r.longitude::float)) *
        cos(radians(r.latitude::float) - lng_rad)
      )
    ) <= radius
  ORDER BY distance_meters
  LIMIT limit_count;
END;
$$;

