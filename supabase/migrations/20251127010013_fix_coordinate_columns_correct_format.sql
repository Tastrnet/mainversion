-- Fix get_nearby_restaurants function to use correct column mapping
-- Previous version assumed columns were swapped, but new data is in correct format
-- latitude column contains latitude values, longitude column contains longitude values

DROP FUNCTION IF EXISTS get_nearby_restaurants(double precision, double precision, int, int);
DROP FUNCTION IF EXISTS get_nearby_restaurants(double precision, double precision, int, int, text[]);

CREATE OR REPLACE FUNCTION get_nearby_restaurants(
  lat double precision,
  lng double precision,
  radius int DEFAULT 5000,
  limit_count int DEFAULT NULL,
  cuisine_names text[] DEFAULT NULL
)
RETURNS TABLE(
  id text,
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
        -- Use columns correctly: latitude column has latitude, longitude column has longitude
        AND CAST(r.latitude AS double precision) BETWEEN lat - lat_delta AND lat + lat_delta
        AND CAST(r.longitude AS double precision) BETWEEN lng - lng_delta AND lng + lng_delta
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
      r.id::text,
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
                (radians(CAST(r.latitude AS double precision)) - lat_rad) / 2
              ),
              2
            ) +
            COS(lat_rad) * COS(radians(CAST(r.latitude AS double precision))) *
            POWER(
              SIN(
                (radians(CAST(r.longitude AS double precision)) - lng_rad) / 2
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
        -- Use columns correctly: latitude column has latitude, longitude column has longitude
        AND CAST(r.latitude AS double precision) BETWEEN lat - lat_delta AND lat + lat_delta
        AND CAST(r.longitude AS double precision) BETWEEN lng - lng_delta AND lng + lng_delta
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
      r.id::text,
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
                (radians(CAST(r.latitude AS double precision)) - lat_rad) / 2
              ),
              2
            ) +
            COS(lat_rad) * COS(radians(CAST(r.latitude AS double precision))) *
            POWER(
              SIN(
                (radians(CAST(r.longitude AS double precision)) - lng_rad) / 2
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








