import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Star, X } from "lucide-react";
import MobileNavigation from "@/components/MobileNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWantToTry } from "@/hooks/useWantToTry";
import { useAuth } from "@/contexts/AuthContext";
import { RestaurantFilterOptions } from "@/components/RestaurantFilterButton";

interface Restaurant {
  id: string;
  name: string;
  rating?: number;
  address?: string;
  added_at?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  cuisines?: string[];
}

const WantToTry = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  
  // Determine if viewing own list or someone else's
  const isOwnProfile = !id || id === user?.id;
  const profileUserId = id || user?.id;
  
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [wantToTryRestaurants, setWantToTryRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { removeFromWantToTry } = useWantToTry();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filters, setFilters] = useState<RestaurantFilterOptions>({
    sortBy: 'recently-added',
    cuisines: '',
    ratingRange: [0, 5]
  });
  const [allCuisines, setAllCuisines] = useState<any[]>([]);

  /* Fetch cuisines for hierarchical filtering */
  useEffect(() => {
    const fetchCuisines = async () => {
      const { data: cuisines } = await supabase
        .from('cuisines')
        .select('*')
        .eq('is_active', true);
      
      if (cuisines) {
        setAllCuisines(cuisines);
      }
    };
    
    fetchCuisines();
  }, []);

  /* Get user's location for distance filtering */
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
          console.log('Location access denied or unavailable:', error);
        }
      );
    }
  }, []);

  /* Fetch want-to-try restaurants from user profile */
  useEffect(() => {
    fetchWantToTryRestaurants();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...wantToTryRestaurants];

    /* Filter by cuisines hierarchically */
    if (filters.cuisines && filters.cuisines !== 'Any' && filters.cuisines.trim() !== '') {
      const selectedCuisine = filters.cuisines.trim();
      
      // Build set of all cuisine names that match the selected filter (including children)
      const matchingCuisineNames = new Set<string>();
      
      allCuisines.forEach(cuisine => {
        // Direct match: selected filter is this exact cuisine name
        if (cuisine.name === selectedCuisine) {
          matchingCuisineNames.add(cuisine.name);
        } 
        // Hierarchical match: selected filter is a parent category of this cuisine
        else {
          for (let i = 1; i <= 5; i++) {
            if (cuisine[`cuisine_category_${i}`] === selectedCuisine) {
              matchingCuisineNames.add(cuisine.name);
              break;
            }
          }
        }
      });
      
      result = result.filter(restaurant => {
        if (!restaurant.cuisines || !Array.isArray(restaurant.cuisines) || restaurant.cuisines.length === 0) {
          return false;
        }
        return restaurant.cuisines.some((cuisine: string) => 
          matchingCuisineNames.has(cuisine)
        );
      });
    }

    // Filter by distance if location is available
    if (userLocation && filters.distance) {
      result = result.filter(restaurant => {
        if (!restaurant.distance) return true; // Include restaurants without coordinates
        return restaurant.distance <= filters.distance!;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'rating':
          if (a.rating === null && b.rating === null) return 0;
          if (a.rating === null) return 1;
          if (b.rating === null) return -1;
          return (b.rating || 0) - (a.rating || 0);
        
        case 'distance':
          // Restaurants without distance go to the end
          if (a.distance === undefined && b.distance === undefined) return 0;
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        
        case 'recently-added':
          // Most recently added first
          if (!a.added_at && !b.added_at) return 0;
          if (!a.added_at) return 1;
          if (!b.added_at) return -1;
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
        
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredRestaurants(result);
  }, [wantToTryRestaurants, filters, userLocation, allCuisines]);

  const fetchWantToTryRestaurants = async () => {
    try {
      if (!profileUserId) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('want_to_try')
        .eq('user_id', profileUserId)
        .single();

      if (profile?.want_to_try && Array.isArray(profile.want_to_try)) {
        const restaurantIds = (profile.want_to_try as unknown as Restaurant[]).map(r => Number(r.id));
        
        // Fetch restaurant details including coordinates and cuisines
        const { data: restaurantDetails } = await supabase
          .from('restaurants')
          .select('id, latitude, longitude, cuisines')
          .in('id', restaurantIds);

        // Fetch ratings for each restaurant
        const restaurantsWithRatings = await Promise.all(
          (profile.want_to_try as unknown as Restaurant[]).map(async (restaurant) => {
            try {
              const { data: reviews } = await supabase
                .from('reviews')
                .select('rating')
                .eq('restaurant_id', Number(restaurant.id))
                .eq('is_hidden', false);
              
              let avgRating = null;
              if (reviews && reviews.length > 0) {
                const validRatings = reviews.filter(r => r.rating !== null);
                if (validRatings.length > 0) {
                  const sum = validRatings.reduce((acc, review) => acc + review.rating, 0);
                  avgRating = Math.round((sum / validRatings.length) * 10) / 10; // Round to 1 decimal
                }
              }

              // Get coordinates from restaurant details
              const details = restaurantDetails?.find(d => d.id === Number(restaurant.id));
              let distance = undefined;

              // Calculate distance if we have both user location and restaurant coordinates
              if (userLocation && details?.latitude && details?.longitude) {
                const R = 6371; // Earth's radius in km
                const dLat = (details.latitude - userLocation.lat) * Math.PI / 180;
                const dLon = (details.longitude - userLocation.lng) * Math.PI / 180;
                const a = 
                  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(userLocation.lat * Math.PI / 180) * 
                  Math.cos(details.latitude * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                distance = R * c; // Distance in km
              }
              
              // Extract cuisines from restaurant details
              const restaurantCuisines = details?.cuisines && Array.isArray(details.cuisines)
                ? details.cuisines.filter((cuisine: any): cuisine is string => typeof cuisine === 'string')
                : [];

              return {
                ...restaurant,
                rating: avgRating,
                latitude: details?.latitude,
                longitude: details?.longitude,
                distance,
                cuisines: restaurantCuisines
              };
            } catch (error) {
              console.error(`Error fetching rating for ${restaurant.name}:`, error);
              return restaurant;
            }
          })
        );
        
        setWantToTryRestaurants(restaurantsWithRatings);
      }
    } catch (error) {
      console.error('Error fetching want-to-try restaurants:', error);
      toast({
        title: "Error",
        description: "Failed to load want-to-try restaurants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromList = async (restaurantId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updatedList = wantToTryRestaurants.filter(restaurant => restaurant.id !== restaurantId);
      
      const { error } = await supabase
        .from('profiles')
        .update({ want_to_try: updatedList as unknown as any })
        .eq('user_id', user.id);

      if (error) throw error;

      setWantToTryRestaurants(updatedList);
      setIsDeleteMode(false);
    } catch (error) {
      console.error('Error removing restaurant:', error);
      toast({
        title: "Error",
        description: "Failed to remove restaurant",
        variant: "destructive",
      });
    }
  };

  const handleLogVisit = (restaurant: Restaurant) => {
    // Navigate to log page with restaurant data (don't remove from want-to-try yet)
    navigate(`/log?restaurant=${restaurant.id}&name=${encodeURIComponent(restaurant.name)}&address=${encodeURIComponent(restaurant.address || '')}`);
  };

  const handleLongPress = () => {
    setIsDeleteMode(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const timer = setTimeout(() => {
      handleLongPress();
    }, 500); // 500ms long press

    const handleTouchEnd = () => {
      clearTimeout(timer);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchmove', handleTouchEnd);
    };

    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchmove', handleTouchEnd);
  };

  const handleClickOutside = () => {
    if (isDeleteMode) {
      setIsDeleteMode(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 select-none">
      {/* Fixed Logo Banner */}
      <div className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border p-3 z-20">
        <h1 
          className="tastr-logo text-2xl text-center cursor-pointer"
          onClick={() => navigate("/start")}
        >
          tastr.
        </h1>
      </div>

      {/* Content with top padding for fixed banner */}
      <div className="pt-16">
        {/* Page Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center justify-between">
            <Button 
              onClick={() => navigate(isOwnProfile ? "/profile" : `/profile/${profileUserId}`)}
              variant="ghost" 
              size="icon"
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-medium">Want to Try</h1>
            {/* Filter button hidden for now */}
            <div className="w-10" />
          </div>
        </div>

        <div className="p-4" onClick={handleClickOutside}>
        {/* Restaurants Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="restaurant-card">
                <CardContent className="p-3">
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded mb-3"></div>
                    <div className="h-8 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredRestaurants.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredRestaurants.map((restaurant) => (
              <div key={restaurant.id} className="relative">
                <Card 
                  className={`restaurant-card cursor-pointer transition-all duration-200 ${isDeleteMode ? 'animate-wiggle' : ''}`}
                  onClick={() => !isDeleteMode && navigate(`/restaurant/${restaurant.id}`)}
                  onTouchStart={handleTouchStart}
                >
                  <CardContent className="p-3">
                    <h4 className="font-medium text-sm text-center mb-2 truncate">{restaurant.name}</h4>
                    
                    <div className="flex items-center justify-center mb-3">
                      <Star className="h-3 w-3 text-primary mr-1 fill-current" />
                      <span className="text-xs text-muted-foreground">
                        {restaurant.rating ? restaurant.rating.toFixed(1) : 'No rating'}
                      </span>
                    </div>

                    {isOwnProfile && (
                      <Button 
                        size="sm" 
                        className="btn-primary w-full text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLogVisit(restaurant);
                        }}
                      >
                        Log Visit
                      </Button>
                    )}
                  </CardContent>
                </Card>
                
                {/* Delete X button - only show in delete mode and for own profile */}
                {isDeleteMode && isOwnProfile && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 bg-muted/80 hover:bg-muted border-2 border-background shadow-lg z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromList(restaurant.id);
                    }}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Card className="restaurant-card">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No restaurants added yet</p>
            </CardContent>
          </Card>
        )}
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default WantToTry;