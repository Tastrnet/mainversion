import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileNavigation from "@/components/MobileNavigation";
import HeaderBanner from "@/components/HeaderBanner";
import RestaurantFilterButton, { RestaurantFilterOptions } from "@/components/RestaurantFilterButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeCuisines } from "@/lib/cuisine-utils";

interface PopularRestaurant {
  id: string;
  name: string;
  address?: string;
  cuisines: string[];
  avgRating: number | null;
  visitCount: number;
}

const PopularFriends = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [popularRestaurants, setPopularRestaurants] = useState<any>(null);
  const [filters, setFilters] = useState<RestaurantFilterOptions>({
    sortBy: 'popularity',
    cuisines: 'Any',
    ratingRange: [0, 5],
    timePeriod: 'month'
  });


  /* Fetch popular restaurants from friends */
  useEffect(() => {
    const fetchPopularRestaurants = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get people the current user is following
        const { data: following, error: followingError } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followingError) {
          console.error('Error fetching following:', followingError);
          setLoading(false);
          return;
        }

        const friendIds = (following || []).map(follow => follow.following_id);

        if (friendIds.length === 0) {
          setPopularRestaurants(null);
          setLoading(false);
          return;
        }

        // Fetch all reviews from friends (for ratings - all time)
        const { data: allReviews, error: allReviewsError } = await supabase
          .from('reviews')
          .select('id, rating, created_at, restaurant_id')
          .in('user_id', friendIds)
          .eq('is_hidden', false);

        if (allReviewsError) {
          console.error('Error fetching all reviews:', allReviewsError);
          setLoading(false);
          return;
        }

        if (!allReviews || allReviews.length === 0) {
          setPopularRestaurants(null);
          setLoading(false);
          return;
        }

        // Get unique restaurant IDs
        const restaurantIds = [...new Set(allReviews.map(r => r.restaurant_id))];

        /* Fetch restaurant data */
        const { data: restaurants } = await supabase
          .from('restaurants')
          .select('id, name, address, cuisines')
          .in('id', restaurantIds);

        /* Calculate all-time ratings for each restaurant - only count ratings >= 0.5 */
        const restaurantRatings = new Map<number, number>(); // Keys are restaurant IDs (numbers)
        const restaurantRatingCounts = new Map<number, number>(); // Keys are restaurant IDs (numbers)
        
        allReviews.forEach(review => {
          if (review.rating && review.rating >= 0.5) {
            const currentSum = restaurantRatings.get(review.restaurant_id) || 0;
            const currentCount = restaurantRatingCounts.get(review.restaurant_id) || 0;
            restaurantRatings.set(review.restaurant_id, currentSum + review.rating);
            restaurantRatingCounts.set(review.restaurant_id, currentCount + 1);
          }
        });

        // Don't set available cuisines here - will be set from filtered restaurants

        // Store data for filtering
        const restaurantData = {
          restaurants,
          allReviews,
          restaurantRatings,
          restaurantRatingCounts
        };

        setPopularRestaurants(restaurantData);
      } catch (error) {
        console.error('Error fetching popular restaurants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularRestaurants();
  }, [user]);

  // Filter reviews by time period and aggregate
  const filteredRestaurants = useMemo(() => {
    if (!popularRestaurants || !popularRestaurants.allReviews) return [];

    const { restaurants, allReviews } = popularRestaurants;

    // Calculate time period cutoff
    const now = new Date();
    let cutoffDate = new Date(0); // default: all time
    
    switch (filters.timePeriod) {
      case '24h':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        cutoffDate = new Date(0);
        break;
    }

    // Filter reviews by time period
    const timeFilteredReviews = allReviews.filter((review: any) => 
      new Date(review.created_at) >= cutoffDate
    );

    if (timeFilteredReviews.length === 0) return [];

    // Calculate ratings from time-filtered reviews only (only count ratings >= 0.5)
    const restaurantRatings = new Map<string, number>();
    const restaurantRatingCounts = new Map<string, number>();
    const restaurantVisitCounts = new Map<string, number>();
    
    timeFilteredReviews.forEach((review: any) => {
      const count = restaurantVisitCounts.get(review.restaurant_id) || 0;
      restaurantVisitCounts.set(review.restaurant_id, count + 1);
      
      if (review.rating && review.rating >= 0.5) {
        const currentSum = restaurantRatings.get(review.restaurant_id) || 0;
        const currentCount = restaurantRatingCounts.get(review.restaurant_id) || 0;
        restaurantRatings.set(review.restaurant_id, currentSum + review.rating);
        restaurantRatingCounts.set(review.restaurant_id, currentCount + 1);
      }
    });

    // Build restaurant list with visit counts and time-filtered ratings
    const restaurantMap = new Map<string, PopularRestaurant>();
    
    restaurantVisitCounts.forEach((visitCount, restaurantId) => {
      const restaurant = restaurants?.find((r: any) => r.id === restaurantId);
      if (!restaurant) return;

      const ratingSum = restaurantRatings.get(restaurantId) || 0;
      const ratingCount = restaurantRatingCounts.get(restaurantId) || 0;
      const avgRating = ratingCount > 0 ? ratingSum / ratingCount : null;

      // Normalize cuisines to ensure consistent format for filtering
      const normalized = normalizeCuisines(restaurant.cuisines);
      const restaurantCuisines = (normalized && Array.isArray(normalized)) 
        ? normalized.filter((cuisine: string) => cuisine && typeof cuisine === 'string').map(c => c.trim()).filter(Boolean)
        : [];
      
      restaurantMap.set(restaurantId, {
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        cuisines: restaurantCuisines,
        avgRating,
        visitCount
      });
    });

    let filtered = Array.from(restaurantMap.values());


    // Sort restaurants
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'popularity':
          // Sort by visits, then rating, then name
          if (b.visitCount !== a.visitCount) {
            return b.visitCount - a.visitCount;
          }
          if ((b.avgRating || 0) !== (a.avgRating || 0)) {
            return (b.avgRating || 0) - (a.avgRating || 0);
          }
          return a.name.localeCompare(b.name);
        case 'rating':
          if ((b.avgRating || 0) !== (a.avgRating || 0)) {
            return (b.avgRating || 0) - (a.avgRating || 0);
          }
          return b.visitCount - a.visitCount;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return b.visitCount - a.visitCount;
      }
    });

    return filtered;
  }, [popularRestaurants, filters]);

  const StarRating = ({ rating }: { rating: number | null }) => {
    if (!rating) return <span className="text-xs text-muted-foreground">No rating</span>;
    
    return (
      <div className="flex items-center justify-center gap-1">
        <Star className="h-3 w-3 text-primary fill-current" />
        <span className="text-xs text-muted-foreground">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <HeaderBanner />
        
        <div className="safe-area-content">
          <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
            <div className="flex items-center justify-center">
              <Button 
                onClick={() => navigate("/start")}
                variant="ghost" 
                size="icon"
                className="rounded-full absolute left-4"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-medium">Popular with Friends</h1>
            </div>
          </div>

          <div className="p-4">
            <div className="flex flex-col items-center justify-center py-12">
              <h1 className="tastr-logo text-3xl mb-4">tastr.</h1>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
        
        <MobileNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />
      
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
            <h1 className="text-2xl font-medium">Popular with Friends</h1>
            {popularRestaurants && !loading ? (
              <RestaurantFilterButton
                filters={filters}
                onFiltersChange={setFilters}
                showTimePeriod={true}
                hideCuisineFilter={true}
                hideRatingFilter={true}
                customSortOptions={[
                  { value: 'popularity', label: 'Popularity' },
                  { value: 'rating', label: 'Rating' },
                  { value: 'name', label: 'Name' },
                ]}
              />
            ) : (
              <div className="w-10 h-10" />
            )}
          </div>
        </div>

        <div className="p-4">
          {filteredRestaurants.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground text-center">No restaurants found matching your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
            {filteredRestaurants.map((restaurant) => (
              <Card 
                key={restaurant.id} 
                className="restaurant-card cursor-pointer"
                onClick={() => navigate(`/restaurant/${restaurant.id}`)}
              >
                <CardContent className="p-3">
                  <h4 className="font-medium text-sm text-center mb-2">{restaurant.name}</h4>
                  <StarRating rating={restaurant.avgRating} />
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {restaurant.visitCount} visit{restaurant.visitCount !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>
            ))}
            </div>
          )}
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default PopularFriends;
