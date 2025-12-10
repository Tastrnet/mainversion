/**
 * MongoDB geospatial implementation for nearby restaurants
 * 
 * This is an alternative implementation using MongoDB's 2dsphere index
 * for efficient geospatial queries. Use this if your backend uses MongoDB.
 * 
 * Setup Requirements:
 * 1. Create a 2dsphere index on the location field:
 *    db.restaurants.createIndex({ location: "2dsphere" })
 * 2. Ensure restaurants have location field in GeoJSON format:
 *    { location: { type: "Point", coordinates: [longitude, latitude] } }
 */

import type { MongoClient, Db, Collection } from 'mongodb';

export interface NearbyRestaurant {
  id: string | number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  cuisines: any;
  is_featured: boolean;
  distance_meters: number;
}

interface RestaurantDocument {
  _id: string | number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  cuisines?: any;
  is_featured?: boolean;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

/**
 * Fetch nearby restaurants using MongoDB 2dsphere index
 * 
 * This uses MongoDB's $geoNear aggregation which:
 * 1. Uses 2dsphere index for O(log n) spatial queries
 * 2. Prefilters restaurants within the specified radius
 * 3. Calculates distance only for restaurants within radius
 * 4. Returns results sorted by distance
 * 
 * Performance: O(log n) using 2dsphere index
 * Suitable for large datasets (100k-1M+ restaurants)
 * 
 * @param db - MongoDB database instance
 * @param lat - Latitude in degrees (WGS84)
 * @param lng - Longitude in degrees (WGS84)
 * @param radius - Search radius in meters (default: 5000 = 5km)
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of nearby restaurants sorted by distance
 * 
 * @example
 * ```typescript
 * import { MongoClient } from 'mongodb';
 * 
 * const client = new MongoClient(connectionString);
 * await client.connect();
 * const db = client.db('restaurant_db');
 * 
 * const restaurants = await fetchNearbyRestaurantsMongoDB(
 *   db,
 *   55.604981,  // Stockholm latitude
 *   13.003822,  // Stockholm longitude
 *   10000,      // 10km radius
 *   50          // Top 50 results
 * );
 * ```
 */
export async function fetchNearbyRestaurantsMongoDB(
  db: Db,
  lat: number,
  lng: number,
  radius: number = 5000,
  limit: number = 20
): Promise<NearbyRestaurant[]> {
  const collection: Collection<RestaurantDocument> = db.collection('restaurants');

  try {
    // Use $geoNear aggregation for efficient geospatial query
    // This leverages the 2dsphere index and only queries restaurants within radius
    const results = await collection
      .aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [lng, lat] // MongoDB uses [longitude, latitude]
            },
            distanceField: 'distance_meters',
            spherical: true, // Use spherical geometry for accurate distance (accounts for Earth's curvature)
            maxDistance: radius, // Filter to restaurants within radius (in meters)
            query: {
              // Optional: Add additional filters here
              // e.g., { is_active: true }
            }
          }
        },
        {
          $limit: limit // Limit results
        },
        {
          $project: {
            // Project only the fields we need
            id: { $ifNull: ['$_id', '$_id'] },
            name: 1,
            address: 1,
            latitude: { $arrayElemAt: ['$location.coordinates', 1] },
            longitude: { $arrayElemAt: ['$location.coordinates', 0] },
            cuisines: 1,
            is_featured: { $ifNull: ['$is_featured', false] },
            distance_meters: 1
          }
        }
      ])
      .toArray();

    // Transform MongoDB documents to our interface
    return results.map((doc: any) => ({
      id: doc.id || doc._id,
      name: doc.name,
      address: doc.address || '',
      latitude: doc.latitude,
      longitude: doc.longitude,
      cuisines: doc.cuisines || [],
      is_featured: doc.is_featured || false,
      distance_meters: doc.distance_meters
    }));
  } catch (error: any) {
    console.error('Error fetching nearby restaurants from MongoDB:', error);
    throw new Error(`Failed to fetch nearby restaurants: ${error.message}`);
  }
}

/**
 * MongoDB schema setup script
 * 
 * Run this in MongoDB shell or use MongoDB client to set up the collection:
 * 
 * ```javascript
 * // Switch to your database
 * use restaurant_db;
 * 
 * // Create 2dsphere index on location field
 * db.restaurants.createIndex({ location: "2dsphere" });
 * 
 * // Example restaurant document structure:
 * db.restaurants.insertOne({
 *   name: "Example Restaurant",
 *   address: "123 Main St",
 *   location: {
 *     type: "Point",
 *     coordinates: [13.003822, 55.604981] // [longitude, latitude]
 *   },
 *   cuisines: ["Italian", "Pizza"],
 *   is_featured: false
 * });
 * ```
 */
export const MONGODB_SETUP_SCRIPT = `
// MongoDB 2dsphere Index Setup
use restaurant_db;

// Create 2dsphere spatial index for efficient geospatial queries
db.restaurants.createIndex({ location: "2dsphere" });

// Verify index was created
db.restaurants.getIndexes();

// Example: Migrate existing documents to GeoJSON format
db.restaurants.find({ latitude: { $exists: true }, longitude: { $exists: true } }).forEach(function(restaurant) {
  db.restaurants.updateOne(
    { _id: restaurant._id },
    {
      $set: {
        location: {
          type: "Point",
          coordinates: [restaurant.longitude, restaurant.latitude]
        }
      }
    }
  );
});
`;



