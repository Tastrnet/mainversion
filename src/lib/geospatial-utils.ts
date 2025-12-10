/**
 * Geospatial utility functions for distance calculations
 * 
 * These functions provide accurate distance calculations between geographic points
 * using the Haversine formula, which accounts for Earth's curvature.
 */

/**
 * Calculate distance between two points on Earth using Haversine formula
 * 
 * The Haversine formula calculates the great-circle distance between two points
 * on a sphere given their longitudes and latitudes. This is accurate for
 * distances up to a few hundred kilometers.
 * 
 * @param lat1 - Latitude of first point in degrees
 * @param lon1 - Longitude of first point in degrees
 * @param lat2 - Latitude of second point in degrees
 * @param lon2 - Longitude of second point in degrees
 * @returns Distance in meters
 * 
 * @example
 * ```typescript
 * const distance = calculateHaversineDistance(
 *   55.604981,  // Stockholm latitude
 *   13.003822,  // Stockholm longitude
 *   55.610981,  // Nearby point latitude
 *   13.009822   // Nearby point longitude
 * );
 * console.log(`Distance: ${distance.toFixed(2)} meters`);
 * ```
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate distance using the simpler spherical law of cosines
 * 
 * Less accurate than Haversine for very short distances, but faster.
 * Good for distances > 1km.
 * 
 * @param lat1 - Latitude of first point in degrees
 * @param lon1 - Longitude of first point in degrees
 * @param lat2 - Latitude of second point in degrees
 * @param lon2 - Longitude of second point in degrees
 * @returns Distance in meters
 */
export function calculateSphericalDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance in a human-readable way
 * 
 * @param meters - Distance in meters
 * @param unit - Preferred unit ('metric' or 'imperial')
 * @returns Formatted distance string
 * 
 * @example
 * ```typescript
 * formatDistance(1234); // "1.2 km"
 * formatDistance(500, 'imperial'); // "0.3 mi"
 * formatDistance(50); // "50 m"
 * ```
 */
export function formatDistance(meters: number, unit: 'metric' | 'imperial' = 'metric'): string {
  if (unit === 'imperial') {
    const miles = meters * 0.000621371;
    if (miles < 1) {
      const feet = meters * 3.28084;
      return `${Math.round(feet)} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  }

  // Metric
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

/**
 * Calculate bounding box coordinates for a given point and radius
 * 
 * This is useful for prefiltering queries before applying distance calculations.
 * The bounding box is slightly larger than the radius to account for edge cases.
 * 
 * @param lat - Center latitude in degrees
 * @param lon - Center longitude in degrees
 * @param radiusMeters - Radius in meters
 * @returns Bounding box coordinates {minLat, maxLat, minLon, maxLon}
 * 
 * @example
 * ```typescript
 * const bbox = calculateBoundingBox(55.604981, 13.003822, 5000);
 * // Use bbox for SQL queries: WHERE latitude BETWEEN bbox.minLat AND bbox.maxLat
 * ```
 */
export function calculateBoundingBox(
  lat: number,
  lon: number,
  radiusMeters: number
): {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
} {
  // Rough approximation: 1 degree latitude ≈ 111 km
  // Longitude varies by latitude: 1 degree ≈ 111 km * cos(latitude)
  const latDegrees = radiusMeters / 111000;
  const lonDegrees = radiusMeters / (111000 * Math.cos(toRadians(lat)));

  return {
    minLat: lat - latDegrees,
    maxLat: lat + latDegrees,
    minLon: lon - lonDegrees,
    maxLon: lon + lonDegrees
  };
}

/**
 * Validate if coordinates are within valid ranges
 * 
 * @param lat - Latitude to validate
 * @param lon - Longitude to validate
 * @returns true if valid, false otherwise
 */
export function isValidCoordinates(lat: number, lon: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}



