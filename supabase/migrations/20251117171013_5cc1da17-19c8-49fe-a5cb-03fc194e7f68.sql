-- Enable PostGIS extension for geospatial support
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry column to restaurants table
-- SRID 4326 is WGS84 (standard GPS coordinates)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

-- Populate geom column for all existing rows with valid coordinates
UPDATE restaurants 
SET geom = ST_SetSRID(ST_Point(longitude, latitude), 4326)
WHERE longitude IS NOT NULL 
  AND latitude IS NOT NULL
  AND geom IS NULL;

-- Create GIST spatial index for fast proximity queries
CREATE INDEX IF NOT EXISTS idx_restaurants_geom ON restaurants USING GIST(geom);

-- Create RPC function to get nearby restaurants
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
  latitude float,
  longitude float,
  cuisines jsonb,
  google_place_id text,
  is_featured boolean,
  distance_meters float
) AS $$
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
$$ LANGUAGE plpgsql STABLE;

-- Create trigger to auto-populate geom on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_restaurant_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.longitude IS NOT NULL AND NEW.latitude IS NOT NULL THEN
    NEW.geom = ST_SetSRID(ST_Point(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_restaurant_geom ON restaurants;
CREATE TRIGGER trigger_update_restaurant_geom
  BEFORE INSERT OR UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurant_geom();