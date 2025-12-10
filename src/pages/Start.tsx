import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Users, TrendingUp, MessageSquare, User } from "lucide-react";
import MobileNavigation from "@/components/MobileNavigation";
import ReviewCard from "@/components/ReviewCard";
import { useFriendReviews } from "@/hooks/useFriendReviews";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchNearbyRestaurants, normalizeRestaurantCoordinates, type NearbyRestaurant } from "@/services/fetchNearbyRestaurants";
import { calculateDistance } from "@/lib/search-utils";

// Nearby restaurants carousel component
const NearbyRestaurantsCarousel = () => {
  const navigate = useNavigate();
  const MAX_RESULTS = 10;
  // No distance limit - fetch all restaurants and show closest ones
  const SEARCH_RADIUS_METERS = 20000000; // 20,000 km - effectively no limit

  type NearbyCarouselRestaurant = NearbyRestaurant & { rating: string | null };

  const [restaurants, setRestaurants] = useState<NearbyCarouselRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationChecked, setLocationChecked] = useState(false);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationChecked(true);
        },
        (error) => {
          console.log('Location access denied for nearby restaurants:', error);
          setUserLocation(null);
          setLocationChecked(true);
        }
      );
    } else {
      setLocationChecked(true);
    }
  }, []);

  useEffect(() => {
    const fetchNearby = async () => {
      if (!userLocation) {
        setLoading(false);
        return;
      }

      try {
        // Fetch all restaurants (no distance limit) - database has less than 500 restaurants
        let baseResults: NearbyRestaurant[] = [];
        
        try {
          baseResults = await fetchNearbyRestaurants(
            userLocation.lat,
            userLocation.lng,
            SEARCH_RADIUS_METERS,
            500 // Fetch up to 500 restaurants (more than database has)
          );
        } catch (rpcError) {
          console.warn('RPC fetch failed, fetching all restaurants directly:', rpcError);
          // Fallback: fetch all restaurants directly and calculate distance
          const { data: allRestaurants, error } = await supabase
            .from('restaurants')
            .select('id, name, address, latitude, longitude, cuisines, is_featured')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .limit(500);

          if (error) {
            console.error('Error fetching all restaurants:', error);
            throw error;
          }

          if (allRestaurants && allRestaurants.length > 0) {
            baseResults = allRestaurants.map((restaurant) => {
              const coords = normalizeRestaurantCoordinates(restaurant, userLocation);
              const lat = coords.latitude ?? Number(restaurant.latitude) ?? 0;
              const lng = coords.longitude ?? Number(restaurant.longitude) ?? 0;
              
              const distanceKm = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                lat,
                lng
              );

              return {
                id: restaurant.id,
                name: restaurant.name,
                address: restaurant.address || '',
                latitude: lat,
                longitude: lng,
                cuisines: restaurant.cuisines,
                is_featured: restaurant.is_featured || false,
                distance_meters: distanceKm * 1000,
                price_level: null,
              } as NearbyRestaurant;
            });
          }
        }

        // Sort by distance (closest first) - no distance filtering
        const sorted = baseResults
          .filter((restaurant) => typeof restaurant.distance_meters === "number")
          .sort(
            (a, b) =>
              (a.distance_meters ?? Number.POSITIVE_INFINITY) -
              (b.distance_meters ?? Number.POSITIVE_INFINITY)
          );

        // Get the closest restaurants
        const topResults = sorted.slice(0, MAX_RESULTS);

        const withRatings = await Promise.all(
          topResults.map(async (restaurant) => {
            const { data: reviewsData } = await supabase
              .from("reviews")
              .select("rating")
              .eq("restaurant_id", restaurant.id as any)
              .gte("rating", 0.5);

            let averageRating: string | null = null;
            if (reviewsData && reviewsData.length > 0) {
              const totalRating = reviewsData.reduce(
                (sum, review) => sum + (review.rating ?? 0),
                0
              );
              averageRating = (totalRating / reviewsData.length).toFixed(1);
            }

            return {
              ...restaurant,
              rating: averageRating,
            };
          })
        );

        setRestaurants(withRatings);
      } catch (error) {
        console.error("Error fetching nearby restaurants:", error);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    if (locationChecked) {
      fetchNearby();
    }
  }, [userLocation, locationChecked]);

  if (loading || !locationChecked) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} className="restaurant-card min-w-[180px]">
            <CardContent className="p-3">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!userLocation) {
    return (
      <Card className="restaurant-card min-w-full">
        <CardContent className="p-6 text-center">
          <MapPin className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <h4 className="font-medium text-sm mb-2">Location unavailable</h4>
          <p className="text-xs text-muted-foreground">
            Turn on location to see nearby restaurants
          </p>
        </CardContent>
      </Card>
    );
  }

  if (restaurants.length === 0) {
    return (
      <Card className="restaurant-card min-w-full">
        <CardContent className="p-6 text-center">
          <h4 className="font-medium text-sm mb-2">No nearby restaurants found</h4>
          <p className="text-xs text-muted-foreground">
            No restaurants found in your area
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {restaurants.map((restaurant) => (
        <Card 
          key={restaurant.id} 
          className="restaurant-card min-w-[180px] cursor-pointer hover-scale"
          onClick={() => navigate(`/restaurant/${restaurant.id}`)}
        >
          <CardContent className="p-3">
            <h4 className="font-medium text-sm text-center mb-2 truncate px-1">{restaurant.name}</h4>
            <div className="flex items-center justify-center mb-1">
              <Star className="h-3 w-3 text-primary mr-1 fill-current" />
              <span className="text-xs text-muted-foreground">
                {restaurant.rating || "No rating"}
              </span>
            </div>
            {typeof restaurant.distance_meters === "number" && (
              <div className="flex items-center justify-center">
                <MapPin className="h-3 w-3 text-muted-foreground mr-1" />
                <span className="text-xs text-muted-foreground">
                  {(restaurant.distance_meters / 1000).toFixed(1)}km
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Popular Restaurants carousel component (all users)
const PopularRestaurantsCarousel = () => {
  const navigate = useNavigate();
  const MAX_DISTANCE_KM = 25;
  const MAX_RESULTS = 10;
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationChecked, setLocationChecked] = useState(false);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationChecked(true);
        },
        (error) => {
          console.log('Location access denied for popular restaurants:', error);
          setLocationChecked(true);
        }
      );
    } else {
      setLocationChecked(true);
    }
  }, []);

  useEffect(() => {
    const fetchPopularRestaurants = async () => {
      try {
        // Get reviews from the last 30 days for monthly visits (all users)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: monthlyReviews } = await supabase
          .from('reviews')
          .select('id, rating, created_at, restaurant_id')
          .eq('is_hidden', false)
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (!monthlyReviews || monthlyReviews.length === 0) {
          setRestaurants([]);
          setLoading(false);
          return;
        }

        // Get all reviews for ratings (all time)
        const { data: allReviews } = await supabase
          .from('reviews')
          .select('rating, restaurant_id')
          .eq('is_hidden', false);

        // Get unique restaurant IDs from monthly reviews
        const restaurantIds = [...new Set(monthlyReviews.map(r => r.restaurant_id))];

        /* Fetch restaurant data with coordinates */
        const { data: restaurantsData } = await supabase
          .from('restaurants')
          .select('id, name, address, cuisines, latitude, longitude')
          .in('id', restaurantIds);

        // Calculate ratings and visit counts
        const restaurantMap = new Map();
        
        monthlyReviews.forEach(review => {
          const count = restaurantMap.get(review.restaurant_id) || 0;
          restaurantMap.set(review.restaurant_id, count + 1);
        });

        const restaurantsWithStats = restaurantsData?.map(restaurant => {
          const monthlyVisits = restaurantMap.get(restaurant.id) || 0;
          
          /* Calculate all-time average rating - only count ratings >= 0.5 */
          const restaurantReviews = allReviews?.filter(r => r.restaurant_id === restaurant.id && r.rating && r.rating >= 0.5);
          let avgRating = null;
          if (restaurantReviews && restaurantReviews.length > 0) {
            const sum = restaurantReviews.reduce((acc, r) => acc + r.rating, 0);
            avgRating = sum / restaurantReviews.length;
          }

          // Calculate distance if user location is available
          let distance_meters: number | undefined;
          if (userLocation && restaurant.latitude !== null && restaurant.longitude !== null) {
            // Normalize coordinates (account for swapped columns)
            const coords = normalizeRestaurantCoordinates(restaurant, userLocation);
            if (coords.latitude !== null && coords.longitude !== null) {
              const distanceKm = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                coords.latitude,
                coords.longitude
              );
              distance_meters = distanceKm * 1000;
              
              // Filter by 25km radius
              if (distanceKm > MAX_DISTANCE_KM) {
                return null; // Filter out restaurants beyond 25km
              }
            }
          }

          return {
            ...restaurant,
            monthlyVisits,
            rating: avgRating,
            distance_meters
          };
        }).filter(Boolean) || [];

        // Filter out restaurants without coordinates or beyond 25km if user location is available
        let filtered = restaurantsWithStats;
        if (userLocation) {
          filtered = filtered.filter(restaurant => {
            if (restaurant.distance_meters === undefined) return false;
            return restaurant.distance_meters <= MAX_DISTANCE_KM * 1000;
          });
        }

        // Sort by monthly visits, then overall rating, then name
        const sorted = filtered
          .sort((a, b) => {
            if (b.monthlyVisits !== a.monthlyVisits) {
              return b.monthlyVisits - a.monthlyVisits;
            }
            if (a.rating !== b.rating) {
              if (a.rating === null) return 1;
              if (b.rating === null) return -1;
              return b.rating - a.rating;
            }
            return a.name.localeCompare(b.name);
          })
          .slice(0, MAX_RESULTS);

        setRestaurants(sorted);
      } catch (error) {
        console.error('Error fetching popular restaurants:', error);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    if (locationChecked) {
      fetchPopularRestaurants();
    }
  }, [userLocation, locationChecked]);

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} className="restaurant-card min-w-[180px]">
            <CardContent className="p-3">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3 mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (restaurants.length === 0) {
    return null; // Hide section if no restaurants
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {restaurants.map((restaurant) => (
        <Card 
          key={restaurant.id} 
          className="restaurant-card min-w-[180px] cursor-pointer hover-scale"
          onClick={() => navigate(`/restaurant/${restaurant.id}`)}
        >
          <CardContent className="p-3">
            <h4 className="font-medium text-sm text-center mb-2 truncate px-1">{restaurant.name}</h4>
            <div className="flex items-center justify-center mb-1">
              <Star className="h-3 w-3 text-primary mr-1 fill-current" />
              <span className="text-xs text-muted-foreground">
                {restaurant.rating ? restaurant.rating.toFixed(1) : "No rating"}
              </span>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-xs text-muted-foreground">
                {restaurant.monthlyVisits} visit{restaurant.monthlyVisits !== 1 ? 's' : ''}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Popular Friends Restaurants carousel component
const PopularFriendsCarousel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopularFriends = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get people the current user is following
        const { data: following } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', user.id);

        const friendIds = (following || []).map(follow => follow.following_id);

        if (friendIds.length === 0) {
          setRestaurants([]);
          setLoading(false);
          return;
        }

        // Get reviews from the last 30 days for monthly visits
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        /* Fetch monthly reviews from friends for visit counts and ratings */
        const { data: monthlyReviews } = await supabase
          .from('reviews')
          .select('id, rating, created_at, restaurant_id')
          .in('user_id', friendIds)
          .eq('is_hidden', false)
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (!monthlyReviews || monthlyReviews.length === 0) {
          setRestaurants([]);
          setLoading(false);
          return;
        }

        // Get unique restaurant IDs from monthly reviews
        const restaurantIds = [...new Set(monthlyReviews.map(r => r.restaurant_id))];

        /* Fetch restaurant data */
        const { data: restaurantsData } = await supabase
          .from('restaurants')
          .select('id, name, address, cuisines')
          .in('id', restaurantIds);

        // Calculate monthly visit counts
        const restaurantMap = new Map();
        
        monthlyReviews.forEach(review => {
          const count = restaurantMap.get(review.restaurant_id) || 0;
          restaurantMap.set(review.restaurant_id, count + 1);
        });

        const restaurantsWithStats = restaurantsData?.map(restaurant => {
          const monthlyVisits = restaurantMap.get(restaurant.id) || 0;
          
          /* Calculate monthly average rating - only count ratings >= 0.5 */
          const restaurantReviews = monthlyReviews?.filter(r => r.restaurant_id === restaurant.id && r.rating && r.rating >= 0.5);
          let avgRating = null;
          if (restaurantReviews && restaurantReviews.length > 0) {
            const sum = restaurantReviews.reduce((acc, r) => acc + r.rating, 0);
            avgRating = sum / restaurantReviews.length;
          }

          return {
            ...restaurant,
            monthlyVisits,
            rating: avgRating
          };
        }) || [];

        // Sort by monthly visits (from friends), then overall rating, then name
        const sorted = restaurantsWithStats
          .sort((a, b) => {
            if (b.monthlyVisits !== a.monthlyVisits) {
              return b.monthlyVisits - a.monthlyVisits;
            }
            if (a.rating !== b.rating) {
              if (a.rating === null) return 1;
              if (b.rating === null) return -1;
              return b.rating - a.rating;
            }
            return a.name.localeCompare(b.name);
          })
          .slice(0, 10);

        setRestaurants(sorted);
      } catch (error) {
        console.error('Error fetching popular friends:', error);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularFriends();
  }, [user]);

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} className="restaurant-card min-w-[180px]">
            <CardContent className="p-3">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3 mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (restaurants.length === 0) {
    return null; // Hide section if no restaurants
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {restaurants.map((restaurant) => (
        <Card 
          key={restaurant.id} 
          className="restaurant-card min-w-[180px] cursor-pointer hover-scale"
          onClick={() => navigate(`/restaurant/${restaurant.id}`)}
        >
          <CardContent className="p-3">
            <h4 className="font-medium text-sm text-center mb-2 truncate px-1">{restaurant.name}</h4>
            <div className="flex items-center justify-center mb-1">
              <Star className="h-3 w-3 text-primary mr-1 fill-current" />
              <span className="text-xs text-muted-foreground">
                {restaurant.rating ? restaurant.rating.toFixed(1) : "No rating"}
              </span>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-xs text-muted-foreground">
                {restaurant.monthlyVisits} visit{restaurant.monthlyVisits !== 1 ? 's' : ''}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Wrapper component for Featured Restaurants section
const FeaturedRestaurantsWrapper = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationChecked, setLocationChecked] = useState(false);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationChecked(true);
        },
        (error) => {
          console.log('Location access denied for featured restaurants:', error);
          setLocationChecked(true);
        }
      );
    } else {
      setLocationChecked(true);
    }
  }, []);

  // Helper function to calculate distance
  const calculateDistance = (point1: {lat: number, lng: number}, point2: {lat: number, lng: number}) => {
    const R = 6371;
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    const fetchFeaturedRestaurants = async () => {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('is_featured', true)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        if (error) {
          console.error('Error fetching featured restaurants:', error);
          setRestaurants([]);
        } else {
          /* Get reviews for each restaurant to calculate average rating - only count ratings >= 0.5 */
          let restaurantsWithRatings = await Promise.all(
            (data || []).map(async (restaurant) => {
              const { data: reviewsData } = await supabase
                .from('reviews')
                .select('rating')
                .eq('restaurant_id', restaurant.id)
                .gte('rating', 0.5);

              let averageRating = null;
              if (reviewsData && reviewsData.length > 0) {
                const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
                averageRating = (totalRating / reviewsData.length).toFixed(1);
              }

              return {
                ...restaurant,
                rating: averageRating
              };
            })
          );

          // Filter by distance (30km) and sort by distance if user location is available
          if (userLocation) {
            restaurantsWithRatings = restaurantsWithRatings
              .map(restaurant => ({
                ...restaurant,
                distance: calculateDistance(userLocation, { 
                  lat: Number(restaurant.latitude), 
                  lng: Number(restaurant.longitude) 
                })
              }))
              .filter(restaurant => restaurant.distance <= 30)
              .sort((a, b) => a.distance - b.distance);
          }
          
          setRestaurants(restaurantsWithRatings);
        }
      } catch (error) {
        console.error('Error fetching featured restaurants:', error);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    if (locationChecked && userLocation) {
      fetchFeaturedRestaurants();
    } else if (locationChecked && !userLocation) {
      setLoading(false);
    }
  }, [userLocation, locationChecked]);

  // Don't render section if no location or no restaurants within 30km
  if (!locationChecked || loading || !userLocation || restaurants.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium">
          Featured restaurants
        </h2>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate("/featured")}
          className="text-primary"
        >
          See all
        </Button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {restaurants.map((restaurant) => (
          <Card 
            key={restaurant.id} 
            className="restaurant-card min-w-[180px] cursor-pointer hover-scale"
            onClick={() => navigate(`/restaurant/${restaurant.id}`)}
          >
            <CardContent className="p-3">
              <h4 className="font-medium text-sm text-center mb-2 truncate px-1">{restaurant.name}</h4>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center">
                  <Star className="h-3 w-3 text-primary mr-1 fill-current" />
                  <span className="text-xs text-muted-foreground">
                    {restaurant.rating ? restaurant.rating : "No rating"}
                  </span>
                </div>
                {restaurant.distance && (
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 text-muted-foreground mr-1" />
                    <span className="text-xs text-muted-foreground">
                      {restaurant.distance.toFixed(1)} km
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

// Wrapper component for Popular Restaurants section
const PopularRestaurantsSection = () => {
  const navigate = useNavigate();
  const [hasRestaurants, setHasRestaurants] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPopularRestaurants = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: monthlyReviews } = await supabase
          .from('reviews')
          .select('id')
          .eq('is_hidden', false)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .limit(1);

        setHasRestaurants((monthlyReviews?.length || 0) > 0);
      } catch (error) {
        console.error('Error checking popular restaurants:', error);
        setHasRestaurants(false);
      } finally {
        setLoading(false);
      }
    };

    checkPopularRestaurants();
  }, []);

  if (loading || !hasRestaurants) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium">
          Popular restaurants
        </h2>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate("/popular-restaurants")}
          className="text-primary"
        >
          See all
        </Button>
      </div>
      <PopularRestaurantsCarousel />
    </section>
  );
};

// Wrapper component for Popular Friends section
const PopularFriendsSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hasRestaurants, setHasRestaurants] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPopularFriends = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: following } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', user.id);

        const friendIds = (following || []).map(follow => follow.following_id);

        if (friendIds.length === 0) {
          setHasRestaurants(false);
          setLoading(false);
          return;
        }

        /* Check if friends have reviews from the last 30 days */
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentReviews } = await supabase
          .from('reviews')
          .select('id')
          .in('user_id', friendIds)
          .eq('is_hidden', false)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .limit(1);

        setHasRestaurants((recentReviews?.length || 0) > 0);
      } catch (error) {
        console.error('Error checking popular friends:', error);
        setHasRestaurants(false);
      } finally {
        setLoading(false);
      }
    };

    checkPopularFriends();
  }, [user]);

  if (loading || !hasRestaurants) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium">
          Popular with friends
        </h2>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate("/popular-friends")}
          className="text-primary"
        >
          See all
        </Button>
      </div>
      <PopularFriendsCarousel />
    </section>
  );
};

const Start = () => {
  const navigate = useNavigate();
  const { recentReviews } = useFriendReviews(5); // Get 5 recent reviews for carousel

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <h1 className="tastr-logo text-3xl text-center">tastr.</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-8">
        {/* Nearby Restaurants Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium">
              Nearby restaurants
            </h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/nearby")}
              className="text-primary"
            >
              See all
            </Button>
          </div>
          <NearbyRestaurantsCarousel />
        </section>

        {/* Featured Restaurants (hidden if empty) */}
        <FeaturedRestaurantsWrapper />

        {/* Popular Restaurants - Check if component has data and render section */}
        <PopularRestaurantsSection />

        {/* Popular with Friends - Check if component has data and render section */}
        <PopularFriendsSection />

        {/* New from Friends */}
        {recentReviews.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium">
                New from friends
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/new-friends")}
                className="text-primary"
              >
                See all
              </Button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recentReviews.map((review) => (
                <ReviewCard 
                  key={review.id} 
                  review={review}
                  onPress={() => navigate(`/review/${review.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
};

export default Start;