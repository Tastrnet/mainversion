-- Fix mutable search_path security issue for PostGIS functions
-- Setting explicit search_path prevents search_path injection attacks

-- Fix get_nearby_restaurants function
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
  google_place_id text,
  is_featured boolean,
  distance_meters float
) 
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
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
    r.google_place_id,
    r.is_featured,
    ST_Distance(
      r.geom::geography,
      ST_SetSRID(ST_Point(lng, lat), 4326)::geography
    ) AS distance_meters
  FROM restaurants r
  WHERE r.geom IS NOT NULL
    AND ST_DWithin(
      r.geom::geography,
      ST_SetSRID(ST_Point(lng, lat), 4326)::geography,
      radius
    )
  ORDER BY r.geom <-> ST_SetSRID(ST_Point(lng, lat), 4326)
  LIMIT limit_count;
END;
$$;

-- Fix update_restaurant_geom function (also uses PostGIS, should have fixed search_path)
CREATE OR REPLACE FUNCTION update_restaurant_geom()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.longitude IS NOT NULL AND NEW.latitude IS NOT NULL THEN
    NEW.geom = ST_SetSRID(ST_Point(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$;






