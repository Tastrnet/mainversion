import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search as SearchIcon, Star, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import HeaderBanner from "@/components/HeaderBanner";
import MobileNavigation from "@/components/MobileNavigation";
import { RestaurantFilterOptions } from "@/components/RestaurantFilterButton";
import { toast } from "sonner";
import { calculateDistance, sortRestaurantsByRelevance } from "@/lib/search-utils";
import {
  fetchNearbyRestaurants,
  normalizeRestaurantCoordinates,
  type NearbyRestaurant,
} from "@/services/fetchNearbyRestaurants";
import { normalizeCuisines } from "@/lib/cuisine-utils";

const Search = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationChecked, setLocationChecked] = useState(false);
  const [filters, setFilters] = useState<RestaurantFilterOptions>({
    sortBy: 'distance',
    cuisines: 'Any',
    ratingRange: [0, 5],
    distance: undefined
  });

  /* Restaurant search function - search restaurants from database */
  const searchRestaurants = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      
      try {
        /* Search restaurants in database by name, address, or city (extracted from address) */
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .or(`name.ilike.%${query}%,address.ilike.%${query}%`);

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

        /* Sort results using shared search utility */
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
    []
  );

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchRestaurants(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchRestaurants]);

  // Get user location for better search results
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationChecked(true);
          console.log('User location obtained for better search results');
        },
        (error) => {
          console.log('Location access denied or failed:', error);
          setLocationChecked(true);
        }
      );
    } else {
      setLocationChecked(true);
    }
  }, []);

  // Load nearby restaurants when there's no search query (same logic as NearbyRestaurants page)
  useEffect(() => {
    const fetchNearbyRestaurantsList = async () => {
      if (!userLocation || searchQuery.trim().length > 0) {
        // Only fetch nearby restaurants when there's no search query
        return;
      }

      try {
        const SEARCH_RADIUS_METERS = 10 * 1000; // 10km same as NearbyRestaurants
        const RPC_FETCH_LIMIT = 1000;

        // Use the same fetchNearbyRestaurants function as NearbyRestaurants page
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

        // Fallback to bounding box query (same as NearbyRestaurants)
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

        // Merge and deduplicate results (same logic as NearbyRestaurants)
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

        // Enrich with ratings (same as search logic)
        if (restaurantsList.length > 0) {
          const restaurantIds = restaurantsList.map((r: any) => String(r.id));
          const { data: reviewsData } = await supabase
            .from('reviews')
            .select('restaurant_id, rating')
            .in('restaurant_id', restaurantIds)
            .not('rating', 'is', null);

          const restaurantsWithRating = restaurantsList.map((restaurant: any) => {
            let avgRating = null;
            if (reviewsData) {
              const restaurantReviews = reviewsData.filter((review: any) => 
                String(review.restaurant_id) === String(restaurant.id) && 
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
              rating: avgRating || restaurant.rating || null
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

    // Filter by distance if specified and user location is available
    if (filters.distance && userLocation) {
      filtered = filtered.filter(restaurant => {
        const getRestaurantCoords = (r: any) => {
          if (r.geometry?.location) {
            return r.geometry.location;
          } else if (r.latitude && r.longitude) {
            return { lat: Number(r.latitude), lng: Number(r.longitude) };
          }
          return null;
        };
        
        const coords = getRestaurantCoords(restaurant);
        if (!coords) return false;
        
        const distance = calculateDistanceWrapper(userLocation, coords);
        return distance <= filters.distance;
      });
    }

    // Filter by rating range
    if (filters.ratingRange[0] > 0 || filters.ratingRange[1] < 5) {
      filtered = filtered.filter(restaurant => {
        if (!restaurant.rating) return filters.ratingRange[0] === 0; // Include unrated if min is 0
        return restaurant.rating >= filters.ratingRange[0] && restaurant.rating <= filters.ratingRange[1];
      });
    }

    /* Filter by cuisines/category with hierarchical matching */
    if (filters.cuisines !== 'Any') {
      try {
        console.log('Filtering by cuisine:', filters.cuisines);
        console.log('Sample restaurant cuisines before filter:', filtered.slice(0, 3).map(r => ({ name: r.name, cuisines: r.cuisines })));
        
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
          
          console.log('Matching cuisine names:', Array.from(matchingCuisineNames));
          
          filtered = filtered.filter(restaurant => {
            /* Extract cuisines from restaurant - cuisines are stored as string arrays in JSONB */
            if (!restaurant.cuisines || !Array.isArray(restaurant.cuisines) || restaurant.cuisines.length === 0) {
              console.log(`Restaurant ${restaurant.name} has no cuisines:`, restaurant.cuisines);
              return false;
            }
            
            // Check if restaurant has any of the matching cuisines
            const hasMatch = restaurant.cuisines.some((cuisine: string) => 
              matchingCuisineNames.has(cuisine)
            );
            console.log(`Restaurant ${restaurant.name} cuisines:`, restaurant.cuisines, 'hasMatch:', hasMatch);
            return hasMatch;
          });
          
          console.log('After cuisine filter:', filtered.length);
        }
      } catch (error) {
        console.error('Error filtering by cuisines:', error);
      }
    }

    // Sort restaurants - when no search query, use same logic as nearby restaurants
    filtered.sort((a, b) => {
      // When there's no search query, use nearby restaurants sorting
      if (!searchQuery.trim()) {
        if (userLocation) {
          // With location: distance -> rating -> name
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
        } else {
          // Without location: rating/accuracy -> name
          const ratingA = a.rating ?? -1;
          const ratingB = b.rating ?? -1;
          if (ratingA !== ratingB) return ratingB - ratingA;
          
          // Then by name
          return (a.name || '').localeCompare(b.name || '');
        }
      }
      
      // When there's a search query, use filter sortBy
      switch (filters.sortBy) {
        case 'distance': {
          // Distance sorting requires userLocation and coordinates
          if (userLocation) {
            const getRestaurantCoords = (restaurant: any) => {
              if (restaurant.geometry?.location) {
                return restaurant.geometry.location;
              } else if (restaurant.latitude && restaurant.longitude) {
                return { lat: Number(restaurant.latitude), lng: Number(restaurant.longitude) };
              }
              return null;
            };
            
            const coordsA = getRestaurantCoords(a);
            const coordsB = getRestaurantCoords(b);
            
            if (coordsA && coordsB) {
              const distanceA = calculateDistanceWrapper(userLocation, coordsA);
              const distanceB = calculateDistanceWrapper(userLocation, coordsB);
              return distanceA - distanceB;
            } else if (coordsA) {
              return -1; // a has coords, b doesn't - a comes first
            } else if (coordsB) {
              return 1; // b has coords, a doesn't - b comes first
            }
          }
          // Fallback to rating/accuracy if no location data
          const ratingA = a.rating ?? -1;
          const ratingB = b.rating ?? -1;
          if (ratingA !== ratingB) {
            return ratingB - ratingA;
          }
          // Then by name
          return a.name.localeCompare(b.name);
        }
        case 'rating': {
          const ratingA = a.rating || 0;
          const ratingB = b.rating || 0;
          if (ratingA === ratingB) {
            if (userLocation) {
              // Fallback to distance when location available
              const getRestaurantCoords = (restaurant: any) => {
                if (restaurant.geometry?.location) {
                  return restaurant.geometry.location;
                } else if (restaurant.latitude && restaurant.longitude) {
                  return { lat: Number(restaurant.latitude), lng: Number(restaurant.longitude) };
                }
                return null;
              };
              
              const coordsA = getRestaurantCoords(a);
              const coordsB = getRestaurantCoords(b);
              
              if (coordsA && coordsB) {
                const distanceA = calculateDistanceWrapper(userLocation, coordsA);
                const distanceB = calculateDistanceWrapper(userLocation, coordsB);
                return distanceA - distanceB;
              }
            }
            // Fallback to name when no location or no coordinates
            return a.name.localeCompare(b.name);
          }
          return ratingB - ratingA;
        }
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price': {
          /* Sort by price: cheapest first, but expensive before missing price
           * Order: 1 (cheap) -> 2 -> 3 -> 4 -> 5 (luxury) -> null (no price data)
           */
          const priceA = a.price_level;
          const priceB = b.price_level;
          
          // Handle missing price_level: restaurants without price go to the end
          if (!priceA && !priceB) {
            // Both missing price, sort by distance if location available, otherwise by rating
            if (userLocation) {
              const getRestaurantCoords = (restaurant: any) => {
                if (restaurant.geometry?.location) {
                  return restaurant.geometry.location;
                } else if (restaurant.latitude && restaurant.longitude) {
                  return { lat: Number(restaurant.latitude), lng: Number(restaurant.longitude) };
                }
                return null;
              };
              
              const coordsA = getRestaurantCoords(a);
              const coordsB = getRestaurantCoords(b);
              
              if (coordsA && coordsB) {
                const distanceA = calculateDistanceWrapper(userLocation, coordsA);
                const distanceB = calculateDistanceWrapper(userLocation, coordsB);
                return distanceA - distanceB;
              }
            }
            // Fallback to rating when no location
            const ratingA = a.rating ?? -1;
            const ratingB = b.rating ?? -1;
            if (ratingA !== ratingB) {
              return ratingB - ratingA;
            }
            return a.name.localeCompare(b.name);
          } else if (!priceA) {
            return 1; // a missing price, put it after b
          } else if (!priceB) {
            return -1; // b missing price, put a first
          }
          
          // Both have price, sort cheapest first
          if (priceA === priceB) {
            // Same price level, fallback to distance if location available, otherwise rating
            if (userLocation) {
              const getRestaurantCoords = (restaurant: any) => {
                if (restaurant.geometry?.location) {
                  return restaurant.geometry.location;
                } else if (restaurant.latitude && restaurant.longitude) {
                  return { lat: Number(restaurant.latitude), lng: Number(restaurant.longitude) };
                }
                return null;
              };
              
              const coordsA = getRestaurantCoords(a);
              const coordsB = getRestaurantCoords(b);
              
              if (coordsA && coordsB) {
                const distanceA = calculateDistanceWrapper(userLocation, coordsA);
                const distanceB = calculateDistanceWrapper(userLocation, coordsB);
                return distanceA - distanceB;
              }
            }
            // Fallback to rating when no location
            const ratingA = a.rating ?? -1;
            const ratingB = b.rating ?? -1;
            if (ratingA !== ratingB) {
              return ratingB - ratingA;
            }
            return a.name.localeCompare(b.name);
          }
          return priceA - priceB; // Cheapest first
        }
        default: {
          // Default fallback to distance if location available, otherwise rating
          if (userLocation) {
            const getRestaurantCoords = (restaurant: any) => {
              if (restaurant.geometry?.location) {
                return restaurant.geometry.location;
              } else if (restaurant.latitude && restaurant.longitude) {
                return { lat: Number(restaurant.latitude), lng: Number(restaurant.longitude) };
              }
              return null;
            };
            
            const coordsA = getRestaurantCoords(a);
            const coordsB = getRestaurantCoords(b);
            
            if (coordsA && coordsB) {
              const distanceA = calculateDistanceWrapper(userLocation, coordsA);
              const distanceB = calculateDistanceWrapper(userLocation, coordsB);
              return distanceA - distanceB;
            }
          }
          // Fallback to rating/accuracy when no location
          const ratingA = a.rating ?? -1;
          const ratingB = b.rating ?? -1;
          if (ratingA !== ratingB) {
            return ratingB - ratingA;
          }
          return a.name.localeCompare(b.name);
        }
      }
    });

    // Return top 10 after filtering and sorting
    return filtered.slice(0, 10);
  };

  // Helper function to check if one tag is a subcategory of another
  const checkCategoryHierarchyMatch = (parentTag: any, childTag: any) => {
    // If it's an exact match
    if (parentTag.name === childTag.name) return true;
    
    // Check if childTag is a subcategory of parentTag
    // A tag is a subcategory if it has the same category path up to the parent's level
    const parentLevel = getTagLevel(parentTag);
    const childLevel = getTagLevel(childTag);
    
    // Child must be at same level or deeper
    if (childLevel < parentLevel) return false;
    
    // Check if the category path matches up to the parent's level
    for (let i = 1; i <= parentLevel; i++) {
      const parentCategory = parentTag[`tag_category_${i}`];
      const childCategory = childTag[`tag_category_${i}`];
      if (!parentCategory || !childCategory || parentCategory !== childCategory) return false;
    }
    
    return true;
  };

  // Helper function to determine the level of a tag (how deep in hierarchy)
  const getTagLevel = (tag: any) => {
    for (let i = 5; i >= 1; i--) {
      if (tag[`tag_category_${i}`]) return i;
    }
    return 0;
  };

  // Helper function to calculate distance between two points (wrapper for imported utility)
  const calculateDistanceWrapper = (point1: {lat: number, lng: number}, point2: {lat: number, lng: number}) => {
    return calculateDistance(point1.lat, point1.lng, point2.lat, point2.lng);
  };

  // Apply filters to both search results and restaurants
  useEffect(() => {
    const applyFiltersAsync = async () => {
      if (searchQuery.trim() && searchResults.length > 0) {
        const filtered = await applyFilters(searchResults);
        setFilteredRestaurants(filtered);
      } else if (!searchQuery.trim() && restaurants.length > 0) {
        const filtered = await applyFilters(restaurants);
        setFilteredRestaurants(filtered);
      } else {
        setFilteredRestaurants([]);
      }
    };
    
    applyFiltersAsync();
  }, [restaurants, searchResults, filters.cuisines, filters.ratingRange, filters.sortBy, filters.distance, userLocation, searchQuery]);

  // Get displayed restaurants - always use filteredRestaurants (which includes filters applied to both search results and all restaurants)
  const displayedRestaurants = filteredRestaurants;

  const clearSearch = () => {
    setSearchQuery("");
  };

  const handleRestaurantClick = (restaurant: any) => {
    if (restaurant.place_id && restaurant.source === 'mapkit_places') {
      // Navigate with MapKit Place ID for MapKit results
      navigate(`/restaurant/mapkit-${restaurant.place_id}?mapkitPlaceId=${restaurant.place_id}`);
    } else {
      // Navigate with internal ID for database results
      navigate(`/restaurant/${restaurant.id || restaurant.place_id}`);
    }
  };

  // Memoize userLocation object to prevent unnecessary re-renders in child components
  const memoizedUserLocation = useMemo(() => {
    if (!userLocation) return undefined;
    return { latitude: userLocation.lat, longitude: userLocation.lng };
  }, [userLocation?.lat, userLocation?.lng]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />
      
      {/* Content with top padding for fixed banner */}
      <div className="safe-area-content">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center justify-between">
            <Button 
              onClick={() => navigate("/start")}
              variant="ghost" 
              size="icon"
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-medium">Search</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="p-4 space-y-6">
        {!locationChecked ? (
          <Card className="restaurant-card">
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                <div className="h-3 bg-muted rounded mb-2 w-1/2"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ) : !userLocation ? (
          <Card className="restaurant-card">
            <CardContent className="p-8 text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium text-lg mb-2">Location unavailable</h3>
              <p className="text-muted-foreground">Turn on location to search restaurants</p>
            </CardContent>
          </Card>
        ) : (
          <>
        {/* Search Bar */}
        <Card className="restaurant-card">
          <CardContent className="p-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
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
              {isSearching ? "Searching restaurants..." : `${displayedRestaurants.length} result${displayedRestaurants.length !== 1 ? 's' : ''}`}
            </span>
          )}
          
          <div className="space-y-3">
            {isSearching ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index} className="restaurant-card">
                    <CardContent className="p-4">
                      <div className="animate-pulse">
                        <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                        <div className="h-3 bg-muted rounded mb-2 w-1/2"></div>
                        <div className="h-3 bg-muted rounded w-1/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : displayedRestaurants.length === 0 && !isSearching ? (
              <Card className="restaurant-card">
                <CardContent className="p-8 text-center space-y-3">
                  <p className="text-muted-foreground">
                    {searchQuery.trim() ? "No restaurants found" : "No restaurants match your filters"}
                  </p>
                  {filters.distance && userLocation && !searchQuery.trim() && (
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>Your distance filter is set to {filters.distance}km from your current location.</p>
                      <p>Try increasing the distance or clear filters to browse all {restaurants.length} restaurants.</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFilters({
                          sortBy: 'distance',
                          cuisines: 'Any',
                          ratingRange: [0, 5],
                          distance: undefined
                        })}
                        className="mt-2"
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              displayedRestaurants.map((restaurant) => {
                // Calculate distance for display
                const getDistance = () => {
                  if (restaurant.distance_meters != null) {
                    return restaurant.distance_meters / 1000;
                  }
                  if (userLocation && restaurant.latitude && restaurant.longitude) {
                    return calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      Number(restaurant.latitude),
                      Number(restaurant.longitude)
                    );
                  }
                  if (userLocation && restaurant.geometry?.location) {
                    return calculateDistanceWrapper(userLocation, restaurant.geometry.location);
                  }
                  return null;
                };

                const distanceKm = getDistance();
                const formatDistance = (km: number | null): string => {
                  if (km === null) return '';
                  return `${km.toFixed(1)} km`;
                };

                // Get address (prioritize address field, then formatted_address, then vicinity)
                const address = restaurant.address || restaurant.formatted_address || restaurant.vicinity || '';

                return (
                  <Card 
                    key={restaurant.id || restaurant.place_id} 
                    className="restaurant-card cursor-pointer hover:shadow-md transition-shadow" 
                    onClick={() => handleRestaurantClick(restaurant)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground">{restaurant.name}</h3>
                          <div className="space-y-1 mt-1 text-sm text-muted-foreground">
                            {typeof address === "string" && address.trim().length > 0 && (
                              <div>{address.trim()}</div>
                            )}
                            {distanceKm !== null && (
                              <div className="text-xs text-muted-foreground">
                                {formatDistance(distanceKm)}
                              </div>
                            )}
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
                );
              })
            )}
          </div>
        </div>
        </>
        )}
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default Search;
