-- STEP 2: Create RPC function to get nearby restaurants
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

-- STEP 3: Create trigger to auto-populate geom on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_restaurant_geom()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.longitude IS NOT NULL AND NEW.latitude IS NOT NULL THEN
    NEW.geom = ST_SetSRID(ST_Point(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_restaurant_geom ON restaurants;
CREATE TRIGGER trigger_update_restaurant_geom
  BEFORE INSERT OR UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurant_geom();