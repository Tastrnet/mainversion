-- Final fix for get_nearby_restaurants function
-- Works with latitude/longitude columns directly (no geom required)
-- Copy and paste this entire SQL into Supabase SQL Editor

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
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.address,
    r.latitude,
    r.longitude,
    r.cuisines,
    r.is_featured,
    -- Calculate distance using Haversine formula
    -- R = 6371000 meters (Earth's radius)
    6371000 * acos(
      LEAST(1.0, 
        sin(radians(lat)) * sin(radians(r.latitude::float)) +
        cos(radians(lat)) * cos(radians(r.latitude::float)) *
        cos(radians(r.longitude::float - lng))
      )
    ) AS distance_meters
  FROM restaurants r
  WHERE r.latitude IS NOT NULL
    AND r.longitude IS NOT NULL
    -- Prefilter using bounding box approximation for better performance
    -- ~111km per degree latitude, longitude varies by latitude
    AND r.latitude BETWEEN lat - (radius::float / 111000.0) 
                      AND lat + (radius::float / 111000.0)
    AND r.longitude BETWEEN lng - (radius::float / (111000.0 * cos(radians(lat))))
                       AND lng + (radius::float / (111000.0 * cos(radians(lat))))
    -- Accurate distance filter using Haversine formula
    AND 6371000 * acos(
      LEAST(1.0,
        sin(radians(lat)) * sin(radians(r.latitude::float)) +
        cos(radians(lat)) * cos(radians(r.latitude::float)) *
        cos(radians(r.longitude::float - lng))
      )
    ) <= radius
  ORDER BY distance_meters
  LIMIT limit_count;
END;
$$;

