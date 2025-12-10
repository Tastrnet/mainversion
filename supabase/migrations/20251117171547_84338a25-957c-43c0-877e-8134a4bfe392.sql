-- STEP 1: Enable PostGIS and add geospatial support

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry column to restaurants table (SRID 4326 = WGS84)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

-- Populate geom for all existing rows with valid coordinates
UPDATE restaurants 
SET geom = ST_SetSRID(ST_Point(longitude, latitude), 4326)
WHERE longitude IS NOT NULL 
  AND latitude IS NOT NULL
  AND geom IS NULL;

-- Create GIST spatial index for fast proximity queries
CREATE INDEX IF NOT EXISTS restaurants_geom_idx ON restaurants USING GIST (geom);