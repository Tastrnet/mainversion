-- Fix for get_nearby_restaurants function - Works with latitude/longitude only
-- This version doesn't require PostGIS or the geom column
-- Copy and paste this entire file into Supabase SQL Editor

DROP FUNCTION IF EXISTS get_nearby_restaurants(float, float, int, int);

-- First, enable PostGIS and create geom column if needed (for future optimization)
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

-- Populate geom column for existing restaurants
UPDATE restaurants 
SET geom = ST_SetSRID(ST_Point(longitude, latitude), 4326)
WHERE longitude IS NOT NULL 
  AND latitude IS NOT NULL
  AND geom IS NULL;

-- Create spatial index if not exists
CREATE INDEX IF NOT EXISTS idx_restaurants_geom ON restaurants USING GIST(geom);

-- Create function that works with or without geom column
CREATE OR REPLACE FUNCTION get_nearby_restaurants(
  user_lat float,
  user_lng float,
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
    -- Calculate distance using Haversine formula (works without PostGIS)
    -- R = 6371000 meters (Earth's radius)
    6371000 * acos(
      LEAST(1.0, 
        sin(radians(user_lat)) * sin(radians(r.latitude::float)) +
        cos(radians(user_lat)) * cos(radians(r.latitude::float)) *
        cos(radians(r.longitude::float - user_lng))
      )
    ) AS distance_meters
  FROM restaurants r
  WHERE r.latitude IS NOT NULL
    AND r.longitude IS NOT NULL
    -- Prefilter using bounding box approximation for performance
    AND r.latitude BETWEEN user_lat - (radius::float / 111000.0) 
                      AND user_lat + (radius::float / 111000.0)
    AND r.longitude BETWEEN user_lng - (radius::float / (111000.0 * cos(radians(user_lat))))
                       AND user_lng + (radius::float / (111000.0 * cos(radians(user_lat))))
    -- Accurate distance filter using Haversine
    AND 6371000 * acos(
      LEAST(1.0,
        sin(radians(user_lat)) * sin(radians(r.latitude::float)) +
        cos(radians(user_lat)) * cos(radians(r.latitude::float)) *
        cos(radians(r.longitude::float - user_lng))
      )
    ) <= radius
  ORDER BY distance_meters
  LIMIT limit_count;
END;
$$;

