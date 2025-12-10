import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MobileNavigation from "@/components/MobileNavigation";
import HeaderBanner from "@/components/HeaderBanner";
import { RestaurantFilterOptions } from "@/components/RestaurantFilterButton";

/* Interface for visited restaurants - id is number to match database */
interface RestaurantWithRatings {
  id: number; // Database has restaurant id as integer
  name: string;
  personalRating: number | null;
  averageRating: number | null;
  cuisines?: any;
  visitedDate: string | null;
  latitude: number | null;
  longitude: number | null;
  distance?: number;
}

const VisitedRestaurants = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { id } = useParams();
  const userId = id || authUser?.id;
  const [visitedRestaurants, setVisitedRestaurants] = useState<RestaurantWithRatings[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<RestaurantWithRatings[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [filters, setFilters] = useState<RestaurantFilterOptions>({
    sortBy: 'recently-visited',
    cuisines: '',
    ratingRange: [0, 5],
    includeNotRated: false,
    distance: undefined,
  });

  // Custom sort options for visited restaurants
  const sortOptions = [
    { value: 'recently-visited' as const, label: 'Latest Visited' },
    { value: 'rating' as const, label: 'Personal Rating' },
    { value: 'popularity' as const, label: 'Average Rating' },
    ...(userLocation ? [{ value: 'distance' as const, label: 'Distance' }] : []),
    { value: 'name' as const, label: 'Name' },
  ];

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Error getting location:', error);
        }
      );
    }
  }, []);

  useEffect(() => {
    const fetchVisitedRestaurants = async () => {
      if (!userId) return;
      
      try {
        /* Fetch all reviews by the user - get latest review per restaurant for rating and visited date */
        const { data: userReviews } = await supabase
          .from('reviews')
          .select('restaurant_id, rating, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (userReviews && userReviews.length > 0) {
          // Get unique restaurant IDs and latest review per restaurant
          const latestReviewsMap = new Map<number, { rating: number | null; visitedDate: string }>(); // Keys are restaurant IDs (numbers)
          userReviews.forEach(review => {
            if (!latestReviewsMap.has(review.restaurant_id)) {
              latestReviewsMap.set(review.restaurant_id, {
                rating: review.rating,
                visitedDate: review.created_at
              });
            }
          });

          const uniqueRestaurantIds = Array.from(latestReviewsMap.keys());
          
          /* Fetch restaurant details with cuisines and location */
          const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id, name, cuisines, latitude, longitude')
            .in('id', uniqueRestaurantIds);

          if (restaurants) {
            // Calculate distance if user location is available
            const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
              const R = 6371; // Earth's radius in km
              const dLat = (lat2 - lat1) * Math.PI / 180;
              const dLon = (lon2 - lon1) * Math.PI / 180;
              const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              return R * c;
            };

            // Calculate personal and average ratings for each restaurant
            const restaurantsWithRatings = await Promise.all(
              restaurants.map(async (restaurant) => {
                // Get latest personal rating and visited date
                const latestReview = latestReviewsMap.get(restaurant.id);
                const personalRating = latestReview?.rating || null;
                const visitedDate = latestReview?.visitedDate || null;

                // Get all reviews for this restaurant to calculate average rating (only ratings >= 0.5)
                const { data: allReviews } = await supabase
                  .from('reviews')
                  .select('rating')
                  .eq('restaurant_id', restaurant.id)
                  .gte('rating', 0.5);

                let averageRating = null;
                if (allReviews && allReviews.length > 0) {
                  const total = allReviews.reduce((sum, review) => sum + review.rating, 0);
                  averageRating = total / allReviews.length;
                }

                // Calculate distance if both locations are available
                let distance: number | undefined = undefined;
                if (userLocation && restaurant.latitude && restaurant.longitude) {
                  distance = calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    Number(restaurant.latitude),
                    Number(restaurant.longitude)
                  );
                }

                return {
                  id: restaurant.id,
                  name: restaurant.name,
                  personalRating,
                  averageRating,
                  cuisines: restaurant.cuisines,
                  visitedDate,
                  latitude: restaurant.latitude ? Number(restaurant.latitude) : null,
                  longitude: restaurant.longitude ? Number(restaurant.longitude) : null,
                  distance,
                };
              })
            );

            setVisitedRestaurants(restaurantsWithRatings);
          }
        }
      } catch (error) {
        console.error('Error fetching visited restaurants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVisitedRestaurants();
  }, [userId, userLocation]);

  // Apply filters and sorting
  useEffect(() => {
    const applyFilters = async () => {
      let result = [...visitedRestaurants];

      /* Filter by cuisines hierarchically */
      if (filters.cuisines && filters.cuisines !== 'Any' && filters.cuisines.trim() !== '') {
        // Fetch the selected cuisine's hierarchy
        const { data: selectedCuisineData } = await supabase
          .from('cuisines')
          .select('*')
          .eq('name', filters.cuisines)
          .eq('is_active', true)
          .single();

        if (selectedCuisineData) {
          // Get all cuisines that match this hierarchy level or are children
          const { data: relatedCuisines } = await supabase
            .from('cuisines')
            .select('*')
            .eq('is_active', true);

          if (relatedCuisines) {
            // Find all cuisines that are in the same hierarchy or children
            const matchingCuisineNames = relatedCuisines
              .filter(cuisine => {
                // Check if this cuisine belongs to the selected hierarchy
                for (let level = 1; level <= 5; level++) {
                  const selectedCategory = selectedCuisineData[`cuisine_category_${level}`];
                  const cuisineCategory = cuisine[`cuisine_category_${level}`];
                  
                  if (selectedCategory && cuisineCategory === selectedCategory) {
                    return true;
                  }
                }
                // Also match if the cuisine name itself matches
                return cuisine.name === filters.cuisines;
              })
              .map(cuisine => cuisine.name);

            // Filter restaurants by matching cuisines
            result = result.filter(restaurant => {
              if (!restaurant.cuisines || !Array.isArray(restaurant.cuisines)) return false;
              /* Check if any cuisine in the restaurant's cuisines array matches any of the hierarchy cuisines */
              return restaurant.cuisines.some((cuisine: string) => 
                matchingCuisineNames.includes(cuisine)
              );
            });
          }
        }
      }

      /* Filter by distance if specified */
      if (filters.distance && userLocation) {
        result = result.filter(restaurant => {
          if (restaurant.distance === undefined) return false;
          return restaurant.distance <= filters.distance!;
        });
      }

      /* Filter by rating range - only when explicitly changed from default [0, 5] */
      const isDefaultRating = filters.ratingRange[0] === 0 && filters.ratingRange[1] === 5;
      if (!isDefaultRating) {
        result = result.filter(restaurant => {
          if (restaurant.personalRating === null) return filters.includeNotRated;
          return restaurant.personalRating >= filters.ratingRange[0] && 
                 restaurant.personalRating <= filters.ratingRange[1];
        });
      }

      // Apply sorting
      result.sort((a, b) => {
        switch (filters.sortBy) {
          case 'recently-visited':
            // Sort by visited date (most recent first)
            if (!a.visitedDate && !b.visitedDate) return 0;
            if (!a.visitedDate) return 1;
            if (!b.visitedDate) return -1;
            return new Date(b.visitedDate).getTime() - new Date(a.visitedDate).getTime();

          case 'rating':
            // Sort by personal rating, with average rating as tiebreaker
            if (a.personalRating === null && b.personalRating === null) return 0;
            if (a.personalRating === null) return 1;
            if (b.personalRating === null) return -1;
            if (a.personalRating !== b.personalRating) {
              return b.personalRating - a.personalRating;
            }
            // Tiebreaker: use average rating
            if (a.averageRating === null && b.averageRating === null) return 0;
            if (a.averageRating === null) return 1;
            if (b.averageRating === null) return -1;
            return b.averageRating - a.averageRating;
          
          case 'popularity':
            // Sort by average rating, with personal rating as tiebreaker
            if (a.averageRating === null && b.averageRating === null) return 0;
            if (a.averageRating === null) return 1;
            if (b.averageRating === null) return -1;
            if (a.averageRating !== b.averageRating) {
              return b.averageRating - a.averageRating;
            }
            // Tiebreaker: use personal rating
            if (a.personalRating === null && b.personalRating === null) return 0;
            if (a.personalRating === null) return 1;
            if (b.personalRating === null) return -1;
            return b.personalRating - a.personalRating;

          case 'distance':
            // Sort by distance
            if (a.distance === undefined && b.distance === undefined) return 0;
            if (a.distance === undefined) return 1;
            if (b.distance === undefined) return -1;
            return a.distance - b.distance;
          
          case 'name':
          default:
            return a.name.localeCompare(b.name);
        }
      });

      setFilteredRestaurants(result);
    };

    applyFilters();
  }, [visitedRestaurants, filters, userLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex flex-col items-center justify-center">
        <h1 className="tastr-logo text-3xl mb-4">tastr.</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />
      
      {/* Content with top padding for fixed banner */}
      <div className="safe-area-content">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center justify-between">
            <Button 
              onClick={() => navigate(-1)}
              variant="ghost" 
              size="icon"
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-medium">Visited Restaurants</h1>
            {/* Filter button hidden for now */}
            <div className="w-10" />
          </div>
        </div>

        <div className="p-4">

          {filteredRestaurants.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredRestaurants.map((restaurant) => (
                <Card 
                  key={restaurant.id} 
                  className="restaurant-card cursor-pointer"
                  onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                >
                  <CardContent className="p-3">
                    <h4 className="font-medium text-sm text-center mb-2 truncate">{restaurant.name}</h4>
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 text-primary fill-current" />
                      {restaurant.personalRating !== null ? (
                        <span>{restaurant.personalRating.toFixed(1)}</span>
                      ) : (
                        <span>No rating</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No visited restaurants found</p>
            </div>
          )}
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default VisitedRestaurants;
