-- Debug queries to check what's happening with nearby restaurants
-- Run these queries in Supabase SQL Editor to diagnose the issue

-- 1. Check if restaurants have latitude/longitude data
SELECT 
  COUNT(*) as total_restaurants,
  COUNT(latitude) as restaurants_with_lat,
  COUNT(longitude) as restaurants_with_lng,
  COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) as restaurants_with_coords
FROM restaurants;

-- 2. Check sample restaurant data
SELECT 
  id,
  name,
  latitude,
  longitude,
  typeof(latitude) as lat_type,
  typeof(longitude) as lng_type
FROM restaurants
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
LIMIT 10;

-- 3. Test the function with a known location (replace with your actual location)
-- Example: Stockholm coordinates (55.604981, 13.003822)
SELECT * FROM get_nearby_restaurants(
  55.604981,  -- Replace with your latitude
  13.003822,  -- Replace with your longitude
  5000,       -- 5km radius
  20          -- Limit
);

-- 4. Check if there are restaurants near a specific point using raw SQL
-- This helps verify if the issue is with the function or the data
SELECT 
  id,
  name,
  latitude,
  longitude,
  6371000 * acos(
    LEAST(1.0,
      sin(radians(55.604981)) * sin(radians(latitude::float)) +
      cos(radians(55.604981)) * cos(radians(latitude::float)) *
      cos(radians(longitude::float - 13.003822))
    )
  ) AS distance_meters
FROM restaurants
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL
  AND latitude::float BETWEEN 55.604981 - 0.05 AND 55.604981 + 0.05  -- Roughly 5km bounding box
  AND longitude::float BETWEEN 13.003822 - 0.05 AND 13.003822 + 0.05
ORDER BY distance_meters
LIMIT 10;



