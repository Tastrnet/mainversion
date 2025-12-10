import { supabase } from "@/integrations/supabase/client";
import { normalizeCuisines } from "@/lib/cuisine-utils";

/* Restaurant interface - matches database schema where id is integer */
export interface Restaurant {
  id: number; // Database has id as integer, not string
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  description?: string;
  google_place_id?: string;
  is_featured?: boolean;
  user_id?: string;
  phone?: string;
  website?: string;
  cuisines?: any; // jsonb field from database
}

export interface FetchRestaurantResponse {
  restaurant: Restaurant;
  source: 'database' | 'mapkit_new' | 'mapkit_updated' | 'google_new' | 'google_updated';
}

export class RestaurantService {
  /**
   * Fetch restaurant data by Place ID (works with MapKit, Google, or database IDs)
   * Checks database first, then creates a basic restaurant record if needed
   */
  static async fetchRestaurantByPlaceId(
    placeId: string,
    restaurantData?: { name: string; address?: string; location?: { lat: number; lng: number } }
  ): Promise<Restaurant> {
    try {
      console.log('Fetching restaurant for Place ID:', placeId);
      
      // First, check if it exists in our database
      const { data: existingRestaurant, error: fetchError } = await supabase
        .from('restaurants')
        .select('*')
        .or(`id.eq.${placeId},google_place_id.eq.${placeId}`)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking for existing restaurant:', fetchError);
        throw new Error('Failed to check existing restaurant');
      }

      if (existingRestaurant) {
        console.log('Restaurant found in database:', existingRestaurant.name);
        return {
          ...existingRestaurant,
          cuisines: normalizeCuisines(existingRestaurant.cuisines),
        };
      }

      /* If not found and we have restaurant data, create a new record
         Note: id is auto-generated as integer by database */
      if (restaurantData) {
        const { data: newRestaurant, error: createError } = await supabase
          .from('restaurants')
          .insert([{
            name: restaurantData.name,
            address: restaurantData.address || '',
            latitude: restaurantData.location?.lat || null,
            longitude: restaurantData.location?.lng || null,
            google_place_id: placeId.startsWith('ChIJ') ? placeId : null, // Google Place IDs start with ChIJ
            is_featured: false,
            user_id: null
          }])
          .select()
          .single();

        if (createError) {
          console.error('Error creating restaurant:', createError);
          throw new Error('Failed to create restaurant record');
        }

        console.log('Created new restaurant:', newRestaurant.name);
        return {
          ...newRestaurant,
          cuisines: normalizeCuisines(newRestaurant.cuisines),
        };
      }

      // If no restaurant data provided, throw error
      throw new Error('Restaurant not found and no data provided to create new record');
      
    } catch (error) {
      console.error('Error fetching restaurant by place ID:', error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility - now uses the generic fetchRestaurantByPlaceId
   */
  static async fetchRestaurantByGooglePlaceId(
    googlePlaceId: string,
    forceRefresh = false
  ): Promise<Restaurant> {
    return this.fetchRestaurantByPlaceId(googlePlaceId);
  }

  /**
   * Force refresh restaurant data from external API (legacy method)
   */
  static async refreshRestaurantData(placeId: string): Promise<Restaurant> {
    return this.fetchRestaurantByPlaceId(placeId);
  }

  /**
   * Get restaurant by internal ID from database
   * For when you already have the restaurant stored locally
   */
  static async getRestaurantById(restaurantId: number): Promise<Restaurant | null> {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching restaurant by ID:', error);
        throw new Error('Failed to fetch restaurant from database');
      }

      if (!data) return null;
      return {
        ...data,
        cuisines: normalizeCuisines(data.cuisines),
      };
    } catch (error) {
      console.error('RestaurantService getById error:', error);
      throw error;
    }
  }

  /**
   * Search restaurants in database
   * For local restaurant search functionality
   */
  static async searchRestaurants(query: string, limit = 10): Promise<Restaurant[]> {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
        .limit(limit);

      if (error) {
        console.error('Error searching restaurants:', error);
        throw new Error('Failed to search restaurants');
      }

      return (
        data?.map((restaurant) => ({
          ...restaurant,
          cuisines: normalizeCuisines(restaurant.cuisines),
        })) || []
      );
    } catch (error) {
      console.error('RestaurantService search error:', error);
      throw error;
    }
  }

  /**
   * Get restaurants near a location
   * For discovering nearby restaurants
   */
  static async getNearbyRestaurants(
    latitude: number,
    longitude: number,
    limit = 20
  ): Promise<Restaurant[]> {
    try {
      // Simple bounding box query - for more accurate distance calculation,
      // you might want to use PostGIS extensions in the future
      const latRange = 0.01; // Roughly 1km
      const lngRange = 0.01;

      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .gte('latitude', latitude - latRange)
        .lte('latitude', latitude + latRange)
        .gte('longitude', longitude - lngRange)
        .lte('longitude', longitude + lngRange)
        .limit(limit);

      if (error) {
        console.error('Error fetching nearby restaurants:', error);
        throw new Error('Failed to fetch nearby restaurants');
      }

      return data || [];
    } catch (error) {
      console.error('RestaurantService nearby error:', error);
      throw error;
    }
  }
}

/* Example usage:

// Basic usage - fetch restaurant by Place ID
const restaurant = await RestaurantService.fetchRestaurantByPlaceId('some_place_id');

// Legacy Google Places compatibility
const restaurant2 = await RestaurantService.fetchRestaurantByGooglePlaceId('ChIJN1t_tDeuEmsRUsoyG83frY4');

// Search local restaurants
const searchResults = await RestaurantService.searchRestaurants('pizza');

// Get nearby restaurants (requires user location)
const nearbyRestaurants = await RestaurantService.getNearbyRestaurants(55.604981, 13.003822);

*/