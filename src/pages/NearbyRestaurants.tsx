import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, Star } from "lucide-react";
import MobileNavigation from "@/components/MobileNavigation";
import HeaderBanner from "@/components/HeaderBanner";
import RestaurantFilterButton, { RestaurantFilterOptions } from "@/components/RestaurantFilterButton";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchNearbyRestaurants,
  normalizeRestaurantCoordinates,
  type NearbyRestaurant,
} from "@/services/fetchNearbyRestaurants";
import { calculateDistance } from "@/lib/search-utils";
import { normalizeCuisines } from "@/lib/cuisine-utils";

type CuisinePath = { name: string; path: string[] };

const buildCuisinePaths = (cuisines: any[]): CuisinePath[] => {
  if (!cuisines?.length) return [];
  return cuisines.map((cuisine) => {
    const path: string[] = [];
    for (let level = 1; level <= 5; level++) {
      const value = cuisine[`cuisine_category_${level}`];
      if (value) {
        path.push(value);
      }
    }
    if (!path.includes(cuisine.name)) {
      path.push(cuisine.name);
    }
    return { name: cuisine.name, path };
  });
};

const getMatchingCuisineNames = (selectedCuisine: string, cuisinePaths: CuisinePath[]): string[] => {
  if (!selectedCuisine || selectedCuisine === "Any" || !cuisinePaths.length) {
    return [];
  }

  const normalizedSelection = selectedCuisine.trim();
  const matches = new Set<string>();

  cuisinePaths.forEach(({ path }) => {
    // Find the index of the selected cuisine in the path
    const selectionIndex = path.findIndex(value => value === normalizedSelection);
    
    if (selectionIndex !== -1) {
      // Only include the selected cuisine and its descendants (everything after it in the path)
      // This ensures that selecting "South Asian" only matches "South Asian" and "Indian", not "Asian"
      for (let i = selectionIndex; i < path.length; i++) {
        matches.add(path[i]);
      }
    }
  });

  return Array.from(matches);
};

const SEARCH_RADIUS_KM = 10;
const SEARCH_RADIUS_METERS = SEARCH_RADIUS_KM * 1000;
const RPC_FETCH_LIMIT = 1000; // Increased to ensure we get all nearby restaurants for cuisine extraction
const MAX_DISPLAY_RESULTS = 15;

const DEFAULT_FILTERS: RestaurantFilterOptions = {
  sortBy: "distance",
  cuisines: "Any",
  ratingRange: [0, 5],
};

/* STEP 5: Simple UI Component for Nearby Restaurants */

type NearbyRestaurantWithRating = NearbyRestaurant & {
  rating?: number | null;
};

const NearbyRestaurants = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<NearbyRestaurantWithRating[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<NearbyRestaurantWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filters, setFilters] = useState<RestaurantFilterOptions>({ ...DEFAULT_FILTERS });
  const [cuisinePaths, setCuisinePaths] = useState<CuisinePath[]>([]);
  const [availableCuisines, setAvailableCuisines] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadCuisineMetadata = async () => {
      if (cuisinePaths.length > 0) return;
      try {
        const { data } = await supabase
          .from("cuisines")
          .select("*")
          .eq("is_active", true)
          .order(
            "cuisine_category_1, cuisine_category_2, cuisine_category_3, cuisine_category_4, cuisine_category_5, name"
          );
        setCuisinePaths(buildCuisinePaths(data || []));
      } catch (metaError) {
        console.error("Failed to load cuisine metadata:", metaError);
      }
    };
    loadCuisineMetadata();
  }, [cuisinePaths.length]);

  const memoizedUserLocation = useMemo(() => {
    if (!userLocation) return undefined;
    return { latitude: userLocation.lat, longitude: userLocation.lng };
  }, [userLocation?.lat, userLocation?.lng]);

  const getRestaurantCoords = (restaurant: NearbyRestaurantWithRating) => {
    if (restaurant.latitude != null && restaurant.longitude != null) {
      return { lat: Number(restaurant.latitude), lng: Number(restaurant.longitude) };
    }
    return null;
  };

  const calculateDistanceWrapper = (
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ) => {
    return calculateDistance(point1.lat, point1.lng, point2.lat, point2.lng);
  };

  const getDistanceMeters = (restaurant: NearbyRestaurantWithRating) => {
    if (typeof restaurant.distance_meters === "number") {
      return restaurant.distance_meters;
    }
    if (userLocation) {
      const coords = getRestaurantCoords(restaurant);
      if (coords) {
        return calculateDistanceWrapper(userLocation, coords) * 1000;
      }
    }
    return Number.POSITIVE_INFINITY;
  };

  const getRatingValue = (restaurant: NearbyRestaurantWithRating) => {
    return typeof restaurant.rating === "number" ? restaurant.rating : null;
  };

  const getPriceLevel = (restaurant: NearbyRestaurantWithRating) => {
    const price = (restaurant as any).price_level;
    if (price === null || price === undefined) return null;
    const numeric = Number(price);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const enrichRestaurantsWithRatings = useCallback(
    async (data: NearbyRestaurant[]): Promise<NearbyRestaurantWithRating[]> => {
      if (!data.length) return [];

      // Convert IDs to strings for consistent querying (database uses TEXT for restaurant_id)
      const restaurantIds = data.map((restaurant) => String(restaurant.id));
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("restaurant_id, rating, price_level")
        .in("restaurant_id", restaurantIds)
        .or("rating.not.is.null,price_level.not.is.null");

      if (reviewsError) {
        console.error("Error fetching ratings:", reviewsError);
        return data;
      }

      return data.map((restaurant) => {
        if (!reviewsData || reviewsData.length === 0) {
          return { ...restaurant, price_level: restaurant.price_level ?? null };
        }

        const restaurantReviews = reviewsData.filter(
          (review) => String(review.restaurant_id) === String(restaurant.id)
        );

        if (restaurantReviews.length === 0) {
          return { ...restaurant, price_level: restaurant.price_level ?? null };
        }

        const ratingReviews = restaurantReviews.filter(
          (review) => review.rating && review.rating >= 0.5
        );
        const priceReviews = restaurantReviews.filter(
          (review) =>
            review.price_level !== null &&
            review.price_level !== undefined &&
            Number(review.price_level) > 0
        );

        let updatedRestaurant: NearbyRestaurantWithRating = { ...restaurant };

        if (ratingReviews.length > 0) {
          const sum = ratingReviews.reduce((acc, review) => acc + (review.rating ?? 0), 0);
          const avgRating = sum / ratingReviews.length;
          updatedRestaurant = { ...updatedRestaurant, rating: avgRating };
        }

        if (priceReviews.length > 0) {
          const priceSum = priceReviews.reduce(
            (acc, review) => acc + Number(review.price_level ?? 0),
            0
          );
          const avgPrice = priceSum / priceReviews.length;
          updatedRestaurant = { ...updatedRestaurant, price_level: avgPrice };
        } else if (updatedRestaurant.price_level === undefined) {
          updatedRestaurant = { ...updatedRestaurant, price_level: null };
        }

        return updatedRestaurant;
      });
    },
    []
  );

  // Get user location using browser Geolocation API
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          setError("Could not get your location. Please enable location services.");
          setLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
    }
  }, []);

  const loadRestaurants = useCallback(async () => {
    if (!userLocation) return;
    if (filters.cuisines !== "Any" && cuisinePaths.length === 0) return;

    const radiusMeters = SEARCH_RADIUS_METERS;

    const matchingNames =
      filters.cuisines !== "Any"
        ? getMatchingCuisineNames(filters.cuisines, cuisinePaths)
        : undefined;

    const ratingFilterActive =
      filters.ratingRange[0] > 0 || filters.ratingRange[1] < 5;
    const cuisineFilterActive = filters.cuisines !== "Any";

    if (filters.cuisines !== "Any" && (!matchingNames || matchingNames.length === 0)) {
      setRestaurants([]);
      setFilteredRestaurants([]);
      return;
    }

    const fetchBoundingBox = async (matchSet?: Set<string>) => {
      const latDelta = SEARCH_RADIUS_KM / 111;
      const lngDelta =
        SEARCH_RADIUS_KM /
        (111 * Math.max(Math.cos((userLocation.lat * Math.PI) / 180), 0.1));

      // Use columns correctly: latitude column has latitude, longitude column has longitude
      let query = supabase
        .from("restaurants")
        .select("*")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        // Use columns correctly for bounding box filter
        .gte("latitude", userLocation.lat - latDelta)   // latitude column has lat values
        .lte("latitude", userLocation.lat + latDelta)   // latitude column has lat values
        .gte("longitude", userLocation.lng - lngDelta) // longitude column has lng values
        .lte("longitude", userLocation.lng + lngDelta); // longitude column has lng values

      const { data, error } = await query;

      if (error) throw error;

      let mapped: NearbyRestaurant[] =
        (data ?? [])
          .map<NearbyRestaurant | null>((restaurant) => {
            const coords = normalizeRestaurantCoordinates(restaurant, userLocation);
            // Use columns correctly: latitude is latitude, longitude is longitude
            const fallbackLat = Number(restaurant.latitude ?? 0);
            const fallbackLng = Number(restaurant.longitude ?? 0);
            const latValue = coords.latitude ?? fallbackLat;
            const lngValue = coords.longitude ?? fallbackLng;

            if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) {
              return null;
            }

            const distanceKm = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              latValue,
              lngValue
            );

            return {
              id: restaurant.id,
              name: restaurant.name,
              address: restaurant.address,
              latitude: latValue,
              longitude: lngValue,
              cuisines: normalizeCuisines(restaurant.cuisines),
              google_place_id: restaurant.google_place_id,
              is_featured: restaurant.is_featured,
              distance_meters: distanceKm * 1000,
              price_level:
                restaurant.price_level === null || restaurant.price_level === undefined
                  ? null
                  : Number(restaurant.price_level),
            };
          })
          .filter((restaurant): restaurant is NearbyRestaurant => Boolean(restaurant));

      if (matchSet && matchSet.size > 0) {
        mapped = mapped.filter(
          (restaurant) =>
            restaurant.cuisines &&
            Array.isArray(restaurant.cuisines) &&
            restaurant.cuisines.some((cuisine: string) => matchSet.has(cuisine))
        );
      }

      return mapped;
    };

    setLoading(true);
    setError(null);

    try {
      // FIRST: Fetch ALL nearby restaurants (without cuisine filter) to get all available cuisines
      // This ensures users can see all available cuisines when changing their selection
      let allNearbyData: NearbyRestaurant[] = [];
      try {
        allNearbyData = await fetchNearbyRestaurants(
          userLocation.lat,
          userLocation.lng,
          radiusMeters,
          RPC_FETCH_LIMIT,
          undefined // No cuisine filter - get ALL nearby restaurants
        );
      } catch (rpcError) {
        console.warn("RPC fetch for all cuisines failed, trying bounding box:", rpcError);
        allNearbyData = [];
      }

      // Augment with bounding box to ensure we get ALL nearby restaurants (not limited by RPC)
      const allBboxData = await fetchBoundingBox(undefined); // No cuisine filter
      
      if (allBboxData.length) {
        // Use string keys for consistent deduplication (handles both string and number IDs)
        const allMerged = new Map<string, NearbyRestaurant>();
        allNearbyData.forEach((restaurant) => {
          const key = String(restaurant.id);
          allMerged.set(key, restaurant);
        });
        allBboxData.forEach((restaurant) => {
          const key = String(restaurant.id);
          const existing = allMerged.get(key);
          if (!existing || restaurant.distance_meters < existing.distance_meters) {
            allMerged.set(key, restaurant);
          }
        });
        allNearbyData = Array.from(allMerged.values());
      }

      // Extract ALL unique cuisines from ALL nearby restaurants (without any filter)
      // This must extract cuisines from EVERY restaurant, including those with multiple cuisines
      const cuisineSet = new Set<string>();
      const restaurantCuisineMap = new Map<string, string[]>(); // restaurant name -> cuisines
      
      allNearbyData.forEach((restaurant) => {
        // Always normalize to ensure consistent format
        const normalized = normalizeCuisines(restaurant.cuisines);
        
        if (normalized && Array.isArray(normalized) && normalized.length > 0) {
          const restaurantCuisines: string[] = [];
          
          // Extract ALL cuisines from this restaurant
          normalized.forEach((cuisine: string) => {
            if (cuisine && typeof cuisine === "string") {
              const trimmed = cuisine.trim();
              if (trimmed) {
                cuisineSet.add(trimmed);
                restaurantCuisines.push(trimmed);
              }
            }
          });
          
          if (restaurant.name) {
            restaurantCuisineMap.set(restaurant.name, restaurantCuisines);
          }
        }
      });
      
      setAvailableCuisines(cuisineSet); // Set available cuisines immediately

      // NOW: Fetch filtered restaurants for display
      const matchSet = matchingNames ? new Set(matchingNames) : undefined;

      let baseData: NearbyRestaurant[] = [];
      try {
        baseData = await fetchNearbyRestaurants(
          userLocation.lat,
          userLocation.lng,
          radiusMeters,
          RPC_FETCH_LIMIT,
          matchingNames ? { cuisines: matchingNames } : undefined
        );
      } catch (rpcError) {
        console.warn("RPC fetch failed, falling back to bounding box query:", rpcError);
        baseData = [];
      }

      const shouldAugmentWithBounding =
        ratingFilterActive || cuisineFilterActive || !baseData.length;

      if (shouldAugmentWithBounding) {
        const bboxData = await fetchBoundingBox(matchSet);
        if (bboxData.length) {
          // Use string keys for consistent deduplication (handles both string and number IDs)
          const merged = new Map<string, NearbyRestaurant>();
          baseData.forEach((restaurant) => {
            const key = String(restaurant.id);
            merged.set(key, restaurant);
          });
          bboxData.forEach((restaurant) => {
            const key = String(restaurant.id);
            const existing = merged.get(key);
            if (!existing || restaurant.distance_meters < existing.distance_meters) {
              merged.set(key, restaurant);
            }
          });
          baseData = Array.from(merged.values());
        }
      }

      const enriched = await enrichRestaurantsWithRatings(baseData);
      
      // Final deduplication pass to ensure no duplicates
      const finalDeduped = new Map<string, NearbyRestaurantWithRating>();
      enriched.forEach((restaurant) => {
        const key = String(restaurant.id);
        const existing = finalDeduped.get(key);
        if (!existing || restaurant.distance_meters < existing.distance_meters) {
          finalDeduped.set(key, restaurant);
        }
      });
      const uniqueRestaurants = Array.from(finalDeduped.values());
      
      console.log('Loaded restaurants:', {
        total: uniqueRestaurants.length,
        withRatings: uniqueRestaurants.filter(r => r.rating != null).length,
        withoutRatings: uniqueRestaurants.filter(r => r.rating == null).length,
        ratingFilter: filters.ratingRange
      });
      
      setRestaurants(uniqueRestaurants);
      setFilteredRestaurants(uniqueRestaurants);
    } catch (err: any) {
      console.error("Error loading nearby restaurants:", err);
      setError(err.message || "Failed to load nearby restaurants.");
      setRestaurants([]);
      setFilteredRestaurants([]);
      setAvailableCuisines(new Set()); // Clear available cuisines on error
    } finally {
      setLoading(false);
    }
  }, [
    userLocation,
    filters.cuisines,
    filters.ratingRange,
    cuisinePaths,
    enrichRestaurantsWithRatings,
  ]);

  useEffect(() => {
    if (!userLocation) return;
    loadRestaurants();
  }, [userLocation, loadRestaurants]);

  const handleRestaurantClick = (restaurant: NearbyRestaurantWithRating) => {
    navigate(`/restaurant/${restaurant.id}`);
  };

  const formatDistance = (meters: number): string => {
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const applyFilters = useCallback(async (): Promise<NearbyRestaurantWithRating[]> => {
    if (!restaurants.length) return [];
    let filtered = [...restaurants];

    // Rating range filter
    if (filters.ratingRange[0] > 0 || filters.ratingRange[1] < 5) {
      filtered = filtered.filter((restaurant) => {
        // If restaurant has no rating, only include if min rating is 0 (showing unrated restaurants)
        if (restaurant.rating == null || restaurant.rating === undefined) {
          return filters.ratingRange[0] === 0;
        }
        // Filter by rating range
        const rating = Number(restaurant.rating);
        return (
          !isNaN(rating) &&
          rating >= filters.ratingRange[0] &&
          rating <= filters.ratingRange[1]
        );
      });
    }

    // Cuisine filter via hierarchical categories
    if (filters.cuisines !== "Any") {
      if (cuisinePaths.length === 0) {
        return filtered;
      }
      const matchingNames = getMatchingCuisineNames(filters.cuisines, cuisinePaths);
      if (matchingNames.length === 0) {
        filtered = [];
      } else {
        const matchingSet = new Set(matchingNames);
        filtered = filtered.filter((restaurant) => {
          if (!restaurant.cuisines || !Array.isArray(restaurant.cuisines) || restaurant.cuisines.length === 0) {
            return false;
          }

          return restaurant.cuisines.some((cuisine: string) => matchingSet.has(cuisine));
        });
      }
    }

    filtered.sort((a, b) => {
      const distanceA = getDistanceMeters(a);
      const distanceB = getDistanceMeters(b);
      if (distanceA !== distanceB) return distanceA - distanceB;

      const ratingA = getRatingValue(a) ?? -1;
      const ratingB = getRatingValue(b) ?? -1;
      if (ratingA !== ratingB) return ratingB - ratingA;

      const priceA = getPriceLevel(a) ?? Number.POSITIVE_INFINITY;
      const priceB = getPriceLevel(b) ?? Number.POSITIVE_INFINITY;
      if (priceA !== priceB) return priceA - priceB;

      return a.name.localeCompare(b.name);
    });

    return filtered.slice(0, MAX_DISPLAY_RESULTS);
  }, [filters, restaurants, userLocation]);

  useEffect(() => {
    let isMounted = true;
    const runFilters = async () => {
      const result = await applyFilters();
      if (isMounted) {
        setFilteredRestaurants(result);
      }
    };

    runFilters();
    return () => {
      isMounted = false;
    };
  }, [applyFilters]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />

      <div className="safe-area-content">
        {/* Page Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between gap-2 p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-medium flex-1 text-center">Nearby Restaurants</h1>
            <RestaurantFilterButton
              filters={filters}
              onFiltersChange={setFilters}
              hasLocation={!!userLocation}
              userLocation={memoizedUserLocation}
              enableSortOptions={false}
              enableDistanceFilter={false}
              availableCuisines={availableCuisines}
            />
          </div>
        </div>

        <div className="p-4 space-y-4">
        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Finding nearby restaurants...</span>
          </div>
        )}

        {/* Restaurant List */}
        {!loading && !error && filteredRestaurants.length > 0 && (
          <div className="space-y-3">
            {filteredRestaurants.map((restaurant) => (
              <Card
                key={String(restaurant.id)}
                className="restaurant-card cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleRestaurantClick(restaurant)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{restaurant.name}</h3>
                      <div className="space-y-1 mt-1 text-sm text-muted-foreground">
                        {typeof restaurant.address === "string" && restaurant.address.trim().length > 0 && (
                          <div>{restaurant.address.trim()}</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {formatDistance(restaurant.distance_meters)}
                        </div>
                        {typeof restaurant.rating === "number" && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Star className="h-3 w-3 mr-1 fill-current text-primary" />
                            <span>{Number(restaurant.rating).toFixed(1)}</span>
                          </div>
                        )}
                        {restaurant.cuisines && Array.isArray(restaurant.cuisines) && restaurant.cuisines.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {restaurant.cuisines.slice(0, 3).join(", ")}
                            {restaurant.cuisines.length > 3 && " • + more"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Results After Filtering */}
        {!loading && !error && restaurants.length > 0 && filteredRestaurants.length === 0 && (
          <Card className="restaurant-card">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                No nearby restaurants match your current filter
              </p>
            </CardContent>
          </Card>
        )}

        {/* No Results */}
        {!loading && !error && restaurants.length === 0 && (
          <Card className="restaurant-card">
            <CardContent className="p-8 text-center space-y-3">
              <p className="text-muted-foreground">
                No nearby restaurants found
              </p>
            </CardContent>
          </Card>
        )}
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default NearbyRestaurants;
