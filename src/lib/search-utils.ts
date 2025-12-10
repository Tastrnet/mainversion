/**
 * Search utility functions for restaurant search
 * Balances location proximity with match quality
 */

interface Restaurant {
  name: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  [key: string]: any;
}

interface UserLocation {
  lat: number;
  lng: number;
}

/**
 * Calculate distance between two coordinates in km
 */
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Get match quality score for a restaurant
 * Higher score = better match
 */
const getMatchScore = (name: string, address: string, query: string): { 
  isExactMatch: boolean;
  nameScore: number;
  addressScore: number;
} => {
  const nameLower = name.toLowerCase();
  const addressLower = (address || '').toLowerCase();
  const queryLower = query.toLowerCase().trim();
  
  // Extract city from address (last part after comma, or whole address if no comma)
  const cityMatch = addressLower ? addressLower.split(',').pop()?.trim() || '' : '';
  
  const isExactMatch = nameLower === queryLower;
  const nameStartsWith = nameLower.startsWith(queryLower) ? 100 : 0;
  const nameContains = nameLower.includes(queryLower) ? 10 : 0;
  const addressContains = addressLower.includes(queryLower) ? 2 : 0;
  const cityContains = cityMatch.includes(queryLower) ? 1 : 0;
  
  return {
    isExactMatch,
    nameScore: isExactMatch ? 1000 : (nameStartsWith || nameContains),
    addressScore: addressContains + cityContains
  };
};

/**
 * Sort restaurants prioritizing distance, then exact matches, then address/city, then visits
 * 
 * Logic:
 * 1. Distance (most important) - closest first
 * 2. Exact name match - exact matches prioritized over non-exact
 * 3. Address/city match - small boost for address/city matches
 * 4. Visit count - more visits = higher priority
 * 5. Name alphabetically as final tiebreaker
 */
export const sortRestaurantsByRelevance = (
  restaurants: Restaurant[],
  query: string,
  userLocation: UserLocation | null
): Restaurant[] => {
  return restaurants.sort((a, b) => {
    const queryLower = query.toLowerCase().trim();
    const aNameLower = (a.name || '').toLowerCase();
    const bNameLower = (b.name || '').toLowerCase();
    const aAddress = a.address || '';
    const bAddress = b.address || '';
    
    // Calculate match scores
    const matchA = getMatchScore(aNameLower, aAddress, queryLower);
    const matchB = getMatchScore(bNameLower, bAddress, queryLower);
    
    // Get visit counts (default to 0 if not available)
    const visitsA = (a as any).visitCount || 0;
    const visitsB = (b as any).visitCount || 0;
    
    // If location available, prioritize distance first
    if (userLocation && a.latitude && a.longitude && b.latitude && b.longitude) {
      const distanceA = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        Number(a.latitude),
        Number(a.longitude)
      );
      const distanceB = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        Number(b.latitude),
        Number(b.longitude)
      );
      
      // 1. PRIORITY: Distance (most important) - but exact matches can override if very far
      // If one is exact match and other isn't, and exact match is within reasonable distance (50km), prioritize it
      const REASONABLE_DISTANCE_KM = 50;
      if (matchA.isExactMatch && !matchB.isExactMatch && distanceA <= REASONABLE_DISTANCE_KM) {
        return -1; // Exact match wins if within reasonable distance
      }
      if (matchB.isExactMatch && !matchA.isExactMatch && distanceB <= REASONABLE_DISTANCE_KM) {
        return 1; // Exact match wins if within reasonable distance
      }
      
      // Otherwise, prioritize distance
      if (Math.abs(distanceA - distanceB) > 0.1) { // If distance difference is significant (>100m)
        return distanceA - distanceB;
      }
      
      // 2. If distances are similar, check for exact matches
      if (matchA.isExactMatch && !matchB.isExactMatch) return -1;
      if (matchB.isExactMatch && !matchA.isExactMatch) return 1;
      
      // 3. Address/city match (small boost)
      const totalScoreA = matchA.nameScore + matchA.addressScore;
      const totalScoreB = matchB.nameScore + matchB.addressScore;
      if (totalScoreA !== totalScoreB) {
        return totalScoreB - totalScoreA;
      }
      
      // 4. Visit count (more visits = higher priority)
      if (visitsA !== visitsB) {
        return visitsB - visitsA;
      }
      
      // 5. Final tiebreaker: distance (if still tied)
      if (distanceA !== distanceB) {
        return distanceA - distanceB;
      }
      
      // 6. Ultimate tiebreaker: name alphabetically
      return aNameLower.localeCompare(bNameLower);
    }
    
    // No location: prioritize exact matches, then rating/accuracy, then name/address match, then visits, then alphabetically
    if (matchA.isExactMatch && !matchB.isExactMatch) return -1;
    if (matchB.isExactMatch && !matchA.isExactMatch) return 1;
    
    // 2. PRIORITY: Rating/accuracy (when location is off, accuracy is most important)
    const ratingA = (a as any).rating ?? -1;
    const ratingB = (b as any).rating ?? -1;
    if (ratingA !== ratingB) {
      return ratingB - ratingA; // Higher rating first
    }
    
    // 3. Name/address match quality
    const totalScoreA = matchA.nameScore + matchA.addressScore;
    const totalScoreB = matchB.nameScore + matchB.addressScore;
    if (totalScoreA !== totalScoreB) {
      return totalScoreB - totalScoreA;
    }
    
    // 4. Visit count (more visits = higher priority)
    if (visitsA !== visitsB) {
      return visitsB - visitsA;
    }
    
    // 5. Final tiebreaker: name alphabetically
    return aNameLower.localeCompare(bNameLower);
  });
};
