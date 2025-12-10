import { supabase } from "@/integrations/supabase/client";
import { normalizeCuisines } from "@/lib/cuisine-utils";

type CoordinateCandidate = { lat: number | null; lng: number | null };
type CoordinateReference = { lat?: number; lng?: number };

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isValidLatitude = (value: number | null) =>
  typeof value === "number" && value >= -90 && value <= 90;

const isValidLongitude = (value: number | null) =>
  typeof value === "number" && value >= -180 && value <= 180;

const buildCoordinatePairs = (record: any): CoordinateCandidate[] => {
  const pairs: CoordinateCandidate[] = [];

  const lat = toNumber(record?.latitude);
  const lng = toNumber(record?.longitude);
  if (lat !== null && lng !== null) {
    pairs.push({ lat, lng });
  }

  const swappedLat = toNumber(record?.longitude);
  const swappedLng = toNumber(record?.latitude);
  if (swappedLat !== null && swappedLng !== null) {
    pairs.push({ lat: swappedLat, lng: swappedLng });
  }

  const altLat = toNumber((record as any)?.Latitud);
  const altLng = toNumber((record as any)?.Longitud);
  if (altLat !== null && altLng !== null) {
    pairs.push({ lat: altLat, lng: altLng });
  }

  const altSwappedLat = toNumber((record as any)?.Longitud);
  const altSwappedLng = toNumber((record as any)?.Latitud);
  if (altSwappedLat !== null && altSwappedLng !== null) {
    pairs.push({ lat: altSwappedLat, lng: altSwappedLng });
  }

  return pairs;
};

export const normalizeRestaurantCoordinates = (
  record: any,
  reference?: CoordinateReference
): { latitude: number | null; longitude: number | null } => {
  const candidates = buildCoordinatePairs(record);
  if (!candidates.length) {
    return {
      latitude: toNumber(record?.latitude) ?? null,
      longitude: toNumber(record?.longitude) ?? null,
    };
  }

  const scoreCandidate = (candidate: CoordinateCandidate) => {
    let score = 0;
    if (
      reference?.lat !== undefined &&
        reference?.lng !== undefined &&
        candidate.lat !== null &&
        candidate.lng !== null
    ) {
      score += Math.abs(candidate.lat - reference.lat);
      score += Math.abs(candidate.lng - reference.lng);
    }

    if (!isValidLatitude(candidate.lat)) {
      score += 1000;
    }

    if (!isValidLongitude(candidate.lng)) {
      score += 1000;
    }

    return score;
  };

  let best = candidates[0];
  let bestScore = scoreCandidate(best);

  for (const candidate of candidates.slice(1)) {
    const score = scoreCandidate(candidate);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return {
    latitude: best.lat,
    longitude: best.lng,
  };
};

/**
 * Efficient geospatial query for nearby restaurants using PostGIS
 * 
 * This implementation uses index-backed PostGIS queries:
 * - ST_DWithin: Uses GIST index for O(log n) spatial filtering
 * - KNN operator (<->): Uses spatial index for efficient distance-based sorting
 * - Only queries restaurants within the specified radius (no full table scan)
 * 
 * Performance: O(log n) using GIST spatial index
 * Suitable for large datasets (100k-1M+ restaurants)
 */

export interface NearbyRestaurant {
  id: string | number; // Can be TEXT (string) or number depending on source
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  cuisines: any;
  google_place_id?: string | null;
  is_featured: boolean;
  distance_meters: number;
  price_level?: number | null;
}

/**
 * Fetch nearby restaurants using efficient PostGIS RPC function
 * 
 * This uses the get_nearby_restaurants RPC which leverages:
 * 1. GIST spatial index on geom column for fast spatial filtering
 * 2. ST_DWithin for index-backed radius filtering (no full table scan)
 * 3. KNN operator (<->) for index-backed distance sorting
 * 4. PostGIS geography type for accurate distance calculations
 * 
 * @param lat - Latitude in degrees (WGS84)
 * @param lng - Longitude in degrees (WGS84)
 * @param radius - Search radius in meters (default: 5000 = 5km)
 * @param limit - Maximum number of results (default: 20)
 * @param options - Additional filter options (e.g., cuisines)
 * @returns Array of nearby restaurants sorted by distance
 * 
 * @example
 * ```typescript
 * const restaurants = await fetchNearbyRestaurants(
 *   55.604981,  // Stockholm latitude
 *   13.003822,  // Stockholm longitude
 *   10000,      // 10km radius
 *   50          // Top 50 results
 * );
 * ```
 */
export async function fetchNearbyRestaurants(
  lat: number,
  lng: number,
  radius: number = 5000,
  limit?: number,
  options?: { cuisines?: string[] }
): Promise<NearbyRestaurant[]> {
  try {
    // Use PostGIS RPC function for efficient index-backed geospatial query
    // This avoids fetching all restaurants and computing distance in JavaScript
    const rpcPayload: Record<string, any> = {
      lat,
      lng,
      radius,
    };

    if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
      rpcPayload.limit_count = limit;
    }

    if (options?.cuisines?.length) {
      rpcPayload.cuisine_names = options.cuisines;
    }

    const { data, error } = await supabase.rpc('get_nearby_restaurants', rpcPayload);

    if (error) {
      console.error('Error fetching nearby restaurants via RPC:', error);
      console.error('Parameters:', { lat, lng, radius });
      throw new Error(`Failed to fetch nearby restaurants: ${error.message}`);
    }

    console.log('Nearby restaurants query result:', {
      count: data?.length || 0,
      params: { lat, lng, radius },
      data: data?.slice(0, 3) // Log first 3 results
    });

    if (!data || data.length === 0) {
      console.warn('No nearby restaurants found. This might indicate:');
      console.warn('1. No restaurants with valid coordinates in database');
      console.warn('2. All restaurants are outside the search radius');
      console.warn('3. Latitude/longitude data might not be populated');
      return [];
    }

    // Return restaurants with distance already calculated by PostGIS
    // Results are already sorted by distance (using KNN operator)
    return data.map((restaurant) => {
      const coordinates = normalizeRestaurantCoordinates(restaurant, { lat, lng });
      const latitude = coordinates.latitude ?? toNumber(restaurant.latitude) ?? 0;
      const longitude = coordinates.longitude ?? toNumber(restaurant.longitude) ?? 0;
      const normalizedPrice = toNumber(restaurant?.price_level);

      return {
        ...restaurant,
        latitude,
        longitude,
        distance_meters: Number(restaurant.distance_meters),
        cuisines: normalizeCuisines(restaurant.cuisines),
        price_level: normalizedPrice ?? null,
      };
    }) as NearbyRestaurant[];
  } catch (error: any) {
    console.error('Error in fetchNearbyRestaurants:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack
    });
    
    // Provide more helpful error messages
    if (error?.message?.includes('type error')) {
      throw new Error('Database type error. Please check that the function signature matches the database schema.');
    } else if (error?.message?.includes('failed to fetch')) {
      throw new Error('Network error or database function error. Check browser console for details.');
    } else {
      throw new Error(`Failed to fetch nearby restaurants: ${error?.message || 'Unknown error'}`);
    }
  }
}
