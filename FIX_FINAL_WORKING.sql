-- Final working version with proper type handling and swapped columns
-- This handles the database having latitude/longitude columns swapped

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
BEGIN
  -- Validate inputs
  IF lat IS NULL OR lng IS NULL THEN
    RETURN;
  END IF;

  -- Convert to radians
  lat_rad := radians(lat);
  lng_rad := radians(lng);
  -- Calculate bounding box (1 degree ≈ 111km)
  radius_degrees := GREATEST(0.05, radius::float / 110000.0);
  
  RETURN QUERY
  SELECT 
    r.id::int,
    COALESCE(r.name, '')::text,
    COALESCE(r.address, '')::text,
    -- SWAPPED: Return in correct order
    r.longitude::numeric AS latitude,
    r.latitude::numeric AS longitude,
    COALESCE(r.cuisines, '[]'::jsonb),
    COALESCE(r.is_featured, false),
    -- Calculate distance (using swapped columns)
    6371000.0 * acos(
      LEAST(1.0, 
        sin(lat_rad) * sin(radians(r.longitude::float)) +
        cos(lat_rad) * cos(radians(r.longitude::float)) *
        cos(radians(r.latitude::float) - lng_rad)
      )
    ) AS distance_meters
  FROM restaurants r
  WHERE r.latitude IS NOT NULL
    AND r.longitude IS NOT NULL
    -- Validate coordinate ranges (swapped)
    AND r.longitude::float BETWEEN -90 AND 90  -- Actual latitude range
    AND r.latitude::float BETWEEN -180 AND 180 -- Actual longitude range
    -- Bounding box filter (swapped)
    AND r.longitude::float BETWEEN lat - radius_degrees AND lat + radius_degrees
    AND r.latitude::float BETWEEN lng - (radius_degrees / GREATEST(0.1, abs(cos(lat_rad))))
                             AND lng + (radius_degrees / GREATEST(0.1, abs(cos(lat_rad))))
    -- Distance filter
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



