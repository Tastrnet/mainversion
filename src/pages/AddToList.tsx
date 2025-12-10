import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, Star, X, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import HeaderBanner from "@/components/HeaderBanner";
import MobileNavigation from "@/components/MobileNavigation";
import { toast } from "sonner";
import { RestaurantService } from "@/services/RestaurantService";
import RestaurantFilterButton, { RestaurantFilterOptions } from "@/components/RestaurantFilterButton";
import { Textarea } from "@/components/ui/textarea";
import { calculateDistance, sortRestaurantsByRelevance } from "@/lib/search-utils";
import { normalizeCuisines } from "@/lib/cuisine-utils";
import {
  fetchNearbyRestaurants,
  normalizeRestaurantCoordinates,
  type NearbyRestaurant,
} from "@/services/fetchNearbyRestaurants";

const AddToList = () => {
  const navigate = useNavigate();
  const { listId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [listRestaurants, setListRestaurants] = useState<number[]>([]); // Restaurant IDs are numbers in database
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [filters, setFilters] = useState<RestaurantFilterOptions>({
    sortBy: 'distance',
    cuisines: 'Any',
    ratingRange: [0, 5]
  });
  const [restaurantNotes, setRestaurantNotes] = useState<Record<number, string>>({}); // Keys are restaurant IDs (numbers)
  const [notesTimeouts, setNotesTimeouts] = useState<Record<string, any>>({});

  /* Fetch current list restaurants to avoid duplicates and get existing notes */
  useEffect(() => {
    const fetchListRestaurants = async () => {
      if (!listId) return;

      try {
        const { data, error } = await supabase
          .from('list_restaurants')
          .select('restaurant_id, notes')
          .eq('list_id', listId);

        if (error) {
          console.error('Error fetching list restaurants:', error);
          return;
        }

        setListRestaurants(data?.map(lr => lr.restaurant_id) || []);
        
        /* Populate notes for restaurants already in list */
        const notesMap: Record<number, string> = {}; // Keys are restaurant IDs (numbers)
        data?.forEach(lr => {
          if (lr.notes) {
            notesMap[lr.restaurant_id] = lr.notes;
          }
        });
        setRestaurantNotes(notesMap);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchListRestaurants();
  }, [listId]);

  // Get user location for better search results
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied or failed:', error);
        }
      );
    }
  }, []);

  /* Restaurant search function - same logic as Search page */
  const searchRestaurants = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      
      try {
        /* Search restaurants in database by name, address, or city (same as Search page) */
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .or(`name.ilike.%${query}%,address.ilike.%${query}%,city.ilike.%${query}%`);

        if (error) {
          console.error('Search error:', error);
          toast.error("Failed to search restaurants. Please try again.");
          setSearchResults([]);
          setIsSearching(false);
          return;
        }

        const results = data || [];

        /* Enhance search results with ratings and visit counts from database reviews */
        const restaurantIds = results.map(r => r.id);
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('restaurant_id, rating')
          .in('restaurant_id', restaurantIds);
        
        // Calculate visit counts (all reviews, not just rated ones)
        const visitCounts = new Map<string, number>();
        if (reviewsData) {
          reviewsData.forEach((review: any) => {
            const key = String(review.restaurant_id);
            visitCounts.set(key, (visitCounts.get(key) || 0) + 1);
          });
        }

        const resultsWithRatings = results.map(restaurant => {
          let avgRating = null;
          const restaurantId = String(restaurant.id);
          
          if (reviewsData) {
            const restaurantReviews = reviewsData.filter((review: any) => 
              String(review.restaurant_id) === restaurantId && 
              review.rating && 
              review.rating >= 0.5
            );
            if (restaurantReviews.length > 0) {
              const sum = restaurantReviews.reduce((acc: number, review: any) => acc + review.rating, 0);
              avgRating = sum / restaurantReviews.length;
            }
          }
          
          return {
            ...restaurant,
            rating: avgRating,
            visitCount: visitCounts.get(restaurantId) || 0,
            cuisines: normalizeCuisines(restaurant.cuisines),
            place_id: restaurant.google_place_id || restaurant.id,
            source: 'database'
          };
        });

        /* Sort results using shared search utility (same as Search page) */
        const sortedResults = sortRestaurantsByRelevance(resultsWithRatings, query, userLocation);

        setSearchResults(sortedResults);
        console.log(`Found ${resultsWithRatings.length} restaurants from search`);
      } catch (error) {
        console.error('Restaurant search error:', error);
        toast.error("Failed to search restaurants. Please try again.");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [userLocation]
  );

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchRestaurants(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchRestaurants]);

  // Load nearby restaurants when there's no search query (same logic as Search page)
  useEffect(() => {
    const fetchNearbyRestaurantsList = async () => {
      if (!userLocation || searchQuery.trim().length > 0) {
        // Only fetch nearby restaurants when there's no search query
        return;
      }

      try {
        const SEARCH_RADIUS_METERS = 10 * 1000; // 10km same as Search page
        const RPC_FETCH_LIMIT = 1000;

        // Use the same fetchNearbyRestaurants function as Search page
        let nearbyData: NearbyRestaurant[] = [];
        try {
          nearbyData = await fetchNearbyRestaurants(
            userLocation.lat,
            userLocation.lng,
            SEARCH_RADIUS_METERS,
            RPC_FETCH_LIMIT,
            undefined // No cuisine filter
          );
        } catch (rpcError) {
          console.warn("RPC fetch failed, trying bounding box:", rpcError);
          nearbyData = [];
        }

        // Fallback to bounding box query (same as Search page)
        const latDelta = 10 / 111; // 10km radius
        const lngDelta = 10 / (111 * Math.max(Math.cos((userLocation.lat * Math.PI) / 180), 0.1));

        const { data: bboxData, error: bboxError } = await supabase
          .from("restaurants")
          .select("*")
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .gte("latitude", userLocation.lat - latDelta)
          .lte("latitude", userLocation.lat + latDelta)
          .gte("longitude", userLocation.lng - lngDelta)
          .lte("longitude", userLocation.lng + lngDelta);

        if (bboxError) {
          console.error("Bounding box query error:", bboxError);
        }

        // Merge and deduplicate results (same logic as Search page)
        const merged = new Map<string, any>();
        
        nearbyData.forEach((restaurant) => {
          const key = String(restaurant.id);
          merged.set(key, {
            ...restaurant,
            rating: restaurant.rating ?? null,
            place_id: restaurant.google_place_id || restaurant.id,
            source: 'database'
          });
        });

        if (bboxData) {
          bboxData.forEach((restaurant: any) => {
            const key = String(restaurant.id);
            const coords = normalizeRestaurantCoordinates(restaurant, userLocation);
            const latValue = coords.latitude ?? Number(restaurant.latitude ?? 0);
            const lngValue = coords.longitude ?? Number(restaurant.longitude ?? 0);

            if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) {
              return;
            }

            const distanceKm = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              latValue,
              lngValue
            );

            const existing = merged.get(key);
            if (!existing || distanceKm * 1000 < existing.distance_meters) {
              merged.set(key, {
                ...restaurant,
                latitude: latValue,
                longitude: lngValue,
                cuisines: normalizeCuisines(restaurant.cuisines),
                distance_meters: distanceKm * 1000,
                rating: null, // Will be enriched later
                place_id: restaurant.google_place_id || restaurant.id,
                source: 'database'
              });
            }
          });
        }

        const restaurantsList = Array.from(merged.values());

        // Enrich with ratings and visit counts (same as Search page)
        if (restaurantsList.length > 0) {
          const restaurantIds = restaurantsList.map((r: any) => String(r.id));
          const { data: reviewsData } = await supabase
            .from('reviews')
            .select('restaurant_id, rating')
            .in('restaurant_id', restaurantIds);

          // Calculate visit counts
          const visitCounts = new Map<string, number>();
          if (reviewsData) {
            reviewsData.forEach((review: any) => {
              const key = String(review.restaurant_id);
              visitCounts.set(key, (visitCounts.get(key) || 0) + 1);
            });
          }

          const restaurantsWithRating = restaurantsList.map((restaurant: any) => {
            let avgRating = null;
            const restaurantId = String(restaurant.id);
            
            if (reviewsData) {
              const restaurantReviews = reviewsData.filter((review: any) => 
                String(review.restaurant_id) === restaurantId && 
                review.rating && 
                review.rating >= 0.5
              );
              if (restaurantReviews.length > 0) {
                const sum = restaurantReviews.reduce((acc: number, review: any) => acc + review.rating, 0);
                avgRating = sum / restaurantReviews.length;
              }
            }
            
            return {
              ...restaurant,
              rating: avgRating || restaurant.rating || null,
              visitCount: visitCounts.get(restaurantId) || 0
            };
          });

          setRestaurants(restaurantsWithRating);
          console.log(`Loaded ${restaurantsWithRating.length} nearby restaurants`);
        }
      } catch (error) {
        console.error('Error loading nearby restaurants:', error);
      }
    };

    fetchNearbyRestaurantsList();
  }, [userLocation, searchQuery]);

  // Apply filters to restaurants
  const applyFilters = async (restaurantList: any[]) => {
    let filtered = [...restaurantList];

    // Filter by rating range
    if (filters.ratingRange[0] > 0 || filters.ratingRange[1] < 5) {
      filtered = filtered.filter(restaurant => {
        if (!restaurant.rating) return filters.ratingRange[0] === 0;
        return restaurant.rating >= filters.ratingRange[0] && restaurant.rating <= filters.ratingRange[1];
      });
    }

    /* Filter by cuisines/category with hierarchical matching */
    if (filters.cuisines !== 'Any') {
      try {
        /* Get all cuisines from database */
        const { data: allCuisines } = await supabase
          .from('cuisines')
          .select('*')
          .eq('is_active', true);
            
        if (allCuisines) {
          const matchingCuisineNames = new Set<string>();
          
          // Find all cuisines that match or are children of the selected cuisine
          allCuisines.forEach(cuisine => {
            // Direct match - if this cuisine IS the selected category
            if (cuisine.name === filters.cuisines) {
              matchingCuisineNames.add(cuisine.name);
            }
            
            // Hierarchical match - if this cuisine has the selected value in ANY category level
            for (let i = 1; i <= 5; i++) {
              if (cuisine[`cuisine_category_${i}`] === filters.cuisines) {
                matchingCuisineNames.add(cuisine.name);
                break;
              }
            }
          });
          
          filtered = filtered.filter(restaurant => {
            /* Extract cuisines from restaurant - cuisines are stored as string arrays in JSONB */
            if (!restaurant.cuisines || !Array.isArray(restaurant.cuisines) || restaurant.cuisines.length === 0) {
              return false;
            }
            
            // Check if restaurant has any of the matching cuisines
            return restaurant.cuisines.some((cuisine: string) => 
              matchingCuisineNames.has(cuisine)
            );
          });
        }
      } catch (error) {
        console.error('Error filtering by cuisines:', error);
      }
    }

    // Sort restaurants - same logic as Search page
    // When there's a search query, results are already sorted by sortRestaurantsByRelevance, so don't re-sort
    // When there's no search query, use nearby restaurants sorting (distance -> rating -> name)
    if (!searchQuery.trim()) {
      filtered.sort((a, b) => {
        // Use nearby restaurants sorting (distance -> rating -> name)
        if (userLocation) {
          // Use distance_meters if available (from nearby restaurants fetch), otherwise calculate
          const getDistanceMeters = (restaurant: any) => {
            if (restaurant.distance_meters != null) {
              return restaurant.distance_meters;
            }
            if (restaurant.latitude && restaurant.longitude) {
              return calculateDistance(
                userLocation.lat,
                userLocation.lng,
                Number(restaurant.latitude),
                Number(restaurant.longitude)
              ) * 1000;
            }
            return Infinity;
          };
          
          const distA = getDistanceMeters(a);
          const distB = getDistanceMeters(b);
          
          if (distA !== distB) return distA - distB;
          
          // Then by rating
          const ratingA = a.rating ?? -1;
          const ratingB = b.rating ?? -1;
          if (ratingA !== ratingB) return ratingB - ratingA;
          
          // Then by name
          return (a.name || '').localeCompare(b.name || '');
        }
        
        // No location: sort by rating, then name
        const ratingA = a.rating ?? -1;
        const ratingB = b.rating ?? -1;
        if (ratingA !== ratingB) return ratingB - ratingA;
        return (a.name || '').localeCompare(b.name || '');
      });
    }
    // When there's a search query, results are already sorted by sortRestaurantsByRelevance, so don't re-sort

    return filtered;
  };


  // Apply filters to search results and restaurants
  useEffect(() => {
    const applyFiltersAsync = async () => {
      if (searchQuery.trim() && searchResults.length > 0) {
        const filtered = await applyFilters(searchResults);
        setFilteredRestaurants(filtered);
      } else if (restaurants.length > 0 && !searchQuery.trim()) {
        const filtered = await applyFilters(restaurants);
        setFilteredRestaurants(filtered);
      } else {
        setFilteredRestaurants([]);
      }
    };
    
    applyFiltersAsync();
  }, [restaurants, searchResults, filters.cuisines, filters.ratingRange, filters.sortBy, userLocation, searchQuery]);

  // Get displayed restaurants
  const displayedRestaurants = filteredRestaurants;

  const clearSearch = () => {
    setSearchQuery("");
  };

  /* Update notes with debounce - restaurantId is number to match database */
  const handleNotesChange = useCallback((restaurantId: number, notes: string) => {
    // Update local state
    setRestaurantNotes(prev => ({ ...prev, [restaurantId]: notes }));

    // Clear existing timeout
    if (notesTimeouts[restaurantId]) {
      clearTimeout(notesTimeouts[restaurantId]);
    }

    // Set new timeout to save
    const timeout = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('list_restaurants')
          .update({ notes: notes || null })
          .eq('list_id', listId)
          .eq('restaurant_id', restaurantId);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating notes:', error);
      }
    }, 500);

    setNotesTimeouts(prev => ({ ...prev, [restaurantId]: timeout }));
  }, [listId, notesTimeouts]);

  const handleAddToList = async (restaurant: any) => {
    if (!listId) return;

    try {
      let restaurantDbId = restaurant.id;

      // If this is a MapKit result, we need to ensure it's in our database first
      if (restaurant.source === 'mapkit_places' && restaurant.place_id) {
        console.log('Adding MapKit restaurant to database first:', restaurant.place_id);
        const dbRestaurant = await RestaurantService.fetchRestaurantByPlaceId(
          restaurant.place_id,
          { 
            name: restaurant.name, 
            address: restaurant.address,
            location: restaurant.geometry?.location 
          }
        );
        restaurantDbId = dbRestaurant.id;
      }

      // Check if restaurant is already in the list
      if (listRestaurants.includes(restaurantDbId)) {
        return;
      }

      // Get current position for new restaurant
      const { data: existingRestaurants, error: fetchError } = await supabase
        .from('list_restaurants')
        .select('position')
        .eq('list_id', listId)
        .order('position', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Error fetching positions:', fetchError);
        toast.error("Failed to add restaurant to list");
        return;
      }

      const nextPosition = existingRestaurants && existingRestaurants.length > 0 
        ? existingRestaurants[0].position + 1 
        : 0;

      /* Add restaurant to list */
      const { error } = await supabase
        .from('list_restaurants')
        .insert({
          list_id: listId,
          restaurant_id: restaurantDbId,
          position: nextPosition,
          notes: null
        });

      if (error) {
        console.error('Error adding restaurant to list:', error);
        toast.error("Failed to add restaurant to list");
        return;
      }

      // Update local state
      setListRestaurants(prev => [...prev, restaurantDbId]);
      setRestaurantNotes(prev => ({ ...prev, [restaurantDbId]: '' }));
      toast.success(`Added ${restaurant.name} to list`);
    } catch (error) {
      console.error('Error adding restaurant to list:', error);
      toast.error("Failed to add restaurant to list");
    }
  };

  /* Remove restaurant from list - restaurantId is number to match database */
  const handleRemoveFromList = async (restaurantId: number, restaurantName: string) => {
    try {
      const { error } = await supabase
        .from('list_restaurants')
        .delete()
        .eq('list_id', listId)
        .eq('restaurant_id', restaurantId);

      if (error) throw error;

      setListRestaurants(prev => prev.filter(id => id !== restaurantId));
      setRestaurantNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[restaurantId];
        return newNotes;
      });
      toast.success(`Removed ${restaurantName} from list`);
    } catch (error) {
      console.error('Error removing restaurant:', error);
      toast.error("Failed to remove restaurant");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />
      
      {/* Content with top padding for fixed banner */}
      <div className="safe-area-content">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center justify-center">
            <Button 
              onClick={() => navigate(`/list/${listId}`)}
              variant="ghost" 
              size="icon"
              className="rounded-full absolute left-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-medium">Add Restaurants</h1>
            <Button 
              onClick={() => navigate(`/list/${listId}`)}
              variant="ghost" 
              size="icon"
              className="rounded-full absolute right-4"
            >
              <Check className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-6">
        {/* Search Bar */}
        <Card className="restaurant-card">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 rounded-xl"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Restaurant Results */}
        <div className="space-y-3">
          {searchQuery.trim() && (
            <span className="text-sm text-muted-foreground">
              {isSearching ? "Searching restaurants..." : `Search Results (${displayedRestaurants.length})`}
            </span>
          )}
          
          <div className="space-y-3">
            {displayedRestaurants.length > 0 ? (
              displayedRestaurants.map((restaurant) => {
                const restaurantId = restaurant.source === 'google_places' ? restaurant.place_id : restaurant.id;
                const isInList = listRestaurants.includes(restaurantId) || listRestaurants.includes(restaurant.id);
                const displayId = restaurant.id || restaurant.place_id;
                
                return (
                  <Card key={displayId} className="restaurant-card">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground">{restaurant.name}</h3>
                          {restaurant.address && (
                            <p className="text-sm text-muted-foreground">{restaurant.address}</p>
                          )}
                          {restaurant.rating && (
                            <div className="flex items-center mt-1">
                              <Star className="h-3 w-3 mr-1 fill-current text-primary" />
                              <span className="text-sm text-muted-foreground">
                                {Number(restaurant.rating).toFixed(1)}
                              </span>
                            </div>
                          )}
                          
                          {isInList && (
                            <Textarea
                              value={restaurantNotes[restaurant.id] || ''}
                              onChange={(e) => handleNotesChange(restaurant.id, e.target.value)}
                              className="mt-3 min-h-[60px] text-sm"
                            />
                          )}
                        </div>

                        <Button
                          onClick={() => isInList ? handleRemoveFromList(restaurant.id, restaurant.name) : handleAddToList(restaurant)}
                          variant={isInList ? "destructive" : "outline"}
                          size="sm"
                          className="mt-1"
                        >
                          {isInList ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : null}
          </div>
        </div>
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default AddToList;