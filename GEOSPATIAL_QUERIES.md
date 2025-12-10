# Efficient Geospatial Restaurant Queries

This document explains the implementation of efficient geospatial queries for finding nearby restaurants without performing full table scans.

## Overview

The solution uses **index-backed geospatial queries** to achieve O(log n) performance, making it suitable for large datasets (100k-1M+ restaurants). Distance calculations are performed only on prefiltered results within the search radius.

## Architecture

### Key Principles

1. **Spatial Indexing**: Uses GIST (PostgreSQL) or 2dsphere (MongoDB) indexes for efficient spatial queries
2. **Prefiltering**: Only queries restaurants within the search radius using index-backed spatial operations
3. **Distance Calculation**: Computes precise distance only for prefiltered results
4. **Sorted Results**: Returns results sorted by distance using index-backed KNN (k-nearest neighbor) operations

### Performance Characteristics

- **Time Complexity**: O(log n) using spatial indexes
- **Space Complexity**: O(n) for index storage
- **Query Type**: Index-only queries (no full table scans)
- **Suitable For**: Large datasets (100k-1M+ restaurants)

## PostgreSQL/PostGIS Implementation

### Database Schema

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry column (auto-populated via trigger)
ALTER TABLE restaurants ADD COLUMN geom geometry(Point, 4326);

-- Create GIST spatial index for fast proximity queries
CREATE INDEX idx_restaurants_geom ON restaurants USING GIST(geom);
```

### RPC Function

The `get_nearby_restaurants` function uses PostGIS spatial operations:

1. **ST_DWithin**: Index-backed spatial filtering (uses GIST index)
2. **KNN Operator (<->)**: Index-backed distance sorting
3. **ST_Distance**: Precise distance calculation using geography type

```sql
CREATE OR REPLACE FUNCTION get_nearby_restaurants(
  lat float,
  lng float,
  radius int DEFAULT 5000,
  limit_count int DEFAULT 20
)
RETURNS TABLE(...) AS $$
BEGIN
  RETURN QUERY
  SELECT ...
  FROM restaurants r
  WHERE r.geom IS NOT NULL
    AND ST_DWithin(...)  -- Index-backed spatial filter
  ORDER BY r.geom <-> ... -- Index-backed KNN sort
  LIMIT limit_count;
END;
$$;
```

### Usage

```typescript
import { fetchNearbyRestaurants } from '@/services/fetchNearbyRestaurants';

const restaurants = await fetchNearbyRestaurants(
  55.604981,  // Latitude
  13.003822,  // Longitude
  5000,       // Radius in meters (5km)
  20          // Max results
);
```

## MongoDB Implementation

### Database Schema

```javascript
// Create 2dsphere spatial index
db.restaurants.createIndex({ location: "2dsphere" });

// Document structure
{
  name: "Restaurant Name",
  address: "123 Main St",
  location: {
    type: "Point",
    coordinates: [longitude, latitude]  // Note: [lng, lat] order
  },
  cuisines: ["Italian", "Pizza"],
  is_featured: false
}
```

### Query Implementation

Uses MongoDB's `$geoNear` aggregation operator which leverages the 2dsphere index:

```typescript
import { fetchNearbyRestaurantsMongoDB } from '@/services/fetchNearbyRestaurants.mongodb';

const restaurants = await fetchNearbyRestaurantsMongoDB(
  db,         // MongoDB database instance
  55.604981,  // Latitude
  13.003822,  // Longitude
  5000,       // Radius in meters
  20          // Max results
);
```

## Distance Calculation Utilities

Distance calculations are provided in `src/lib/geospatial-utils.ts`:

- `calculateHaversineDistance`: Accurate distance using Haversine formula
- `calculateSphericalDistance`: Faster approximation for longer distances
- `formatDistance`: Human-readable distance formatting
- `calculateBoundingBox`: Calculate bounding box for prefiltering

## Performance Comparison

### Inefficient Approach (Full Table Scan)
```typescript
// ❌ BAD: Fetches ALL restaurants, calculates distance for each
const allRestaurants = await supabase.from('restaurants').select('*');
const nearby = allRestaurants
  .map(r => calculateDistance(userLat, userLng, r.lat, r.lng))
  .filter(r => r.distance <= radius)
  .sort((a, b) => a.distance - b.distance);
```
- **Time Complexity**: O(n)
- **Performance**: Slow for large datasets (100k+ restaurants)
- **Database Load**: High (fetches all rows)

### Efficient Approach (Index-Backed)
```typescript
// ✅ GOOD: Uses spatial index to prefilter, only calculates distance for nearby restaurants
const restaurants = await fetchNearbyRestaurants(lat, lng, radius, limit);
```
- **Time Complexity**: O(log n)
- **Performance**: Fast even for large datasets (1M+ restaurants)
- **Database Load**: Low (only queries nearby restaurants)

## Index Maintenance

### PostgreSQL/PostGIS

Indexes are automatically maintained by PostgreSQL. The GIST index updates when:
- New restaurants are inserted (trigger populates `geom` column)
- Restaurant coordinates are updated (trigger updates `geom` column)
- VACUUM/ANALYZE is run (automatic in most setups)

### MongoDB

The 2dsphere index automatically updates when documents are inserted/updated. Monitor index usage:

```javascript
// Check index usage
db.restaurants.find({ location: { $geoWithin: { ... } } }).explain("executionStats");

// Verify index exists
db.restaurants.getIndexes();
```

## API Endpoint Examples

See `src/services/api-examples.ts` for complete examples:

- Next.js API Routes (Pages Router)
- Next.js API Routes (App Router)
- Express.js Routes
- Supabase Edge Functions

## Testing Performance

### Query Analysis (PostgreSQL)

```sql
-- Analyze query plan
EXPLAIN ANALYZE
SELECT * FROM get_nearby_restaurants(55.604981, 13.003822, 5000, 20);

-- Check index usage
SELECT * FROM pg_stat_user_indexes WHERE indexrelname = 'idx_restaurants_geom';
```

### Expected Query Plan

```
Index Scan using idx_restaurants_geom on restaurants
  Index Cond: (geom && '...'::geometry)
  Filter: (st_dwithin(...))
  Rows Removed by Filter: X
Planning Time: X ms
Execution Time: X ms  -- Should be < 10ms for typical queries
```

## Best Practices

1. **Always use spatial indexes**: Never query without an index for large datasets
2. **Set reasonable radius limits**: Default to 5-20km, allow user configuration
3. **Limit result sets**: Always use LIMIT to prevent returning too many results
4. **Cache frequent queries**: Consider caching results for popular locations
5. **Monitor index performance**: Regularly check index usage and query times
6. **Handle edge cases**: Validate coordinates, handle nulls, provide fallbacks

## Migration Guide

### From Inefficient to Efficient Queries

1. **Add spatial index** (if not exists):
   ```sql
   CREATE INDEX idx_restaurants_geom ON restaurants USING GIST(geom);
   ```

2. **Update RPC function** (run migration):
   ```bash
   supabase migration up
   ```

3. **Update service calls**:
   ```typescript
   // Before
   const all = await fetchAllRestaurants();
   const nearby = filterByDistance(all, userLocation);
   
   // After
   const nearby = await fetchNearbyRestaurants(lat, lng, radius);
   ```

## Troubleshooting

### Slow Queries

- **Check index exists**: `\d restaurants` (PostgreSQL) or `db.restaurants.getIndexes()` (MongoDB)
- **Verify index is used**: Use EXPLAIN ANALYZE (PostgreSQL) or explain() (MongoDB)
- **Check table statistics**: Ensure statistics are up to date (`ANALYZE restaurants`)

### No Results Returned

- **Verify coordinates**: Ensure latitude (-90 to 90) and longitude (-180 to 180) are valid
- **Check radius**: Radius might be too small, try increasing it
- **Verify data**: Ensure restaurants have valid `geom` (PostgreSQL) or `location` (MongoDB)

### Index Not Used

- **Check query syntax**: Ensure using spatial operators (ST_DWithin, $geoNear)
- **Verify data type**: Ensure using geometry/geography (PostgreSQL) or GeoJSON (MongoDB)
- **Check index type**: Ensure using GIST (PostgreSQL) or 2dsphere (MongoDB)

## References

- [PostGIS Documentation](https://postgis.net/documentation/)
- [MongoDB Geospatial Queries](https://docs.mongodb.com/manual/geospatial-queries/)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
- [GIST Indexing](https://www.postgresql.org/docs/current/gist.html)



