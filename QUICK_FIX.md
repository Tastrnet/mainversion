# Quick Fix: Remove google_place_id Dependency

## Problem
The `get_nearby_restaurants` RPC function is trying to access `google_place_id` column which doesn't exist, causing the error:
```
"failed to fetch nearby restaurants. failed to fetch restaurants: column restaurants.google_place_id does not exist"
```

## Solution
Run the SQL below directly in your Supabase Dashboard SQL Editor.

## Steps

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/pgcfvoyajemtcyaxpefg/sql/new
   - Or: Dashboard → SQL Editor → New Query

2. **Copy and paste this SQL:**

```sql
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
```

3. **Click "Run" button** (or press Cmd/Ctrl + Enter)

4. **Verify success** - You should see a success message like "Success. No rows returned"

5. **Test** - Go back to your app and try the nearby restaurants page again

## Direct Link
Click here to open SQL Editor directly:
https://supabase.com/dashboard/project/pgcfvoyajemtcyaxpefg/sql/new

## What this does
- Removes the old function that references `google_place_id`
- Creates a new function without `google_place_id` dependency
- Keeps all the efficient geospatial indexing intact
- Uses PostGIS for fast spatial queries (O(log n) performance)



