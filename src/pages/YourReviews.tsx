import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, User, Star } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import MobileNavigation from "@/components/MobileNavigation";
import HeaderBanner from "@/components/HeaderBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ReviewCard from "@/components/ReviewCard";
import RestaurantFilterButton, { RestaurantFilterOptions } from "@/components/RestaurantFilterButton";

const YourReviews = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  
  // Determine if viewing own reviews or someone else's
  const isOwnProfile = !id || id === user?.id;
  const profileUserId = id || user?.id;
  
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [allCuisines, setAllCuisines] = useState<any[]>([]);
  const [filters, setFilters] = useState<RestaurantFilterOptions>({
    sortBy: 'recently-visited',
    cuisines: 'Any',
    ratingRange: [0, 5],
    distance: undefined
  });

  /* Fetch cuisines for filtering */
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

  /* Get user location for distance filtering */
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

  useEffect(() => {
    const fetchUserReviews = async () => {
      if (!profileUserId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch all user reviews
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('id, rating, comment, created_at, user_id, restaurant_id, is_hidden')
          .eq('user_id', profileUserId)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false });

        if (reviewsError) {
          console.error('Error fetching reviews:', reviewsError);
          setLoading(false);
          return;
        }

        if (!reviewsData || reviewsData.length === 0) {
          setReviews([]);
          setLoading(false);
          return;
        }

        // Get restaurant data for the reviews
        const restaurantIds = reviewsData.map(review => review.restaurant_id);
        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('id, name, address, latitude, longitude, cuisines')
          .in('id', restaurantIds);

        if (restaurantError) {
          console.error('Error fetching restaurants:', restaurantError);
          setLoading(false);
          return;
        }

        // Get user profile data
        const { data: profileData } = await supabase
          .from('public_profiles')
          .select('user_id, username, full_name, avatar_url')
          .eq('user_id', profileUserId)
          .single();

        // Create restaurant map for quick lookup
        const restaurantMap = new Map(restaurantData?.map(r => [r.id, r]));

        // Combine review data with restaurant data
        const reviewsWithRestaurants = reviewsData.map(review => ({
          ...review,
          restaurant: restaurantMap.get(review.restaurant_id),
          reviewer: profileData
        }));

        setReviews(reviewsWithRestaurants);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserReviews();
  }, [profileUserId]);

  /* Helper function to calculate distance */
  const calculateDistance = (point1: {lat: number, lng: number}, point2: {lat: number, lng: number}) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  /* Filter and sort reviews */
  const filteredReviews = useMemo(() => {
    let filtered = [...reviews];

    /* Filter by cuisine (hierarchical) */
    if (filters.cuisines !== 'Any') {
      const selectedCuisine = filters.cuisines.trim();
      const matchingCuisineNames = new Set<string>();
      
      allCuisines.forEach(cuisine => {
        if (cuisine.name === selectedCuisine) {
          matchingCuisineNames.add(cuisine.name);
        } else {
          for (let i = 1; i <= 5; i++) {
            if (cuisine[`cuisine_category_${i}`] === selectedCuisine) {
              matchingCuisineNames.add(cuisine.name);
              break;
            }
          }
        }
      });
      
      filtered = filtered.filter(review => {
        const restaurant = review.restaurant;
        if (!restaurant?.cuisines || !Array.isArray(restaurant.cuisines) || restaurant.cuisines.length === 0) {
          return false;
        }
        return restaurant.cuisines.some((cuisine: string) => matchingCuisineNames.has(cuisine));
      });
    }

    /* Filter by rating range */
    filtered = filtered.filter(review => {
      if (!review.rating || review.rating === 0) {
        return filters.ratingRange[0] === 0;
      }
      return review.rating >= filters.ratingRange[0] && review.rating <= filters.ratingRange[1];
    });

    /* Filter by distance */
    if (filters.distance && userLocation) {
      filtered = filtered.filter(review => {
        const restaurant = review.restaurant;
        if (!restaurant?.latitude || !restaurant?.longitude) return false;
        
        const distance = calculateDistance(userLocation, {
          lat: Number(restaurant.latitude),
          lng: Number(restaurant.longitude)
        });
        return distance <= filters.distance!;
      });
    }

    /* Sort reviews */
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'recently-visited':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'rating':
          const ratingA = a.rating || 0;
          const ratingB = b.rating || 0;
          if (ratingA !== ratingB) {
            return ratingB - ratingA;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'name':
          return (a.restaurant?.name || '').localeCompare(b.restaurant?.name || '');
        case 'distance':
          if (userLocation && a.restaurant?.latitude && b.restaurant?.latitude) {
            const distA = calculateDistance(userLocation, {
              lat: Number(a.restaurant.latitude),
              lng: Number(a.restaurant.longitude)
            });
            const distB = calculateDistance(userLocation, {
              lat: Number(b.restaurant.latitude),
              lng: Number(b.restaurant.longitude)
            });
            return distA - distB;
          }
          return 0;
        default:
          return 0;
      }
    });

    return filtered;
  }, [reviews, filters, allCuisines, userLocation]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />
      
      {/* Content with top padding for fixed banner */}
      <div className="safe-area-content">
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
          <h1 className="text-2xl font-medium">Reviews</h1>
          {reviews.length > 0 ? (
            <RestaurantFilterButton
              filters={filters}
              onFiltersChange={setFilters}
              hasLocation={!!userLocation}
              userLocation={userLocation ? { latitude: userLocation.lat, longitude: userLocation.lng } : undefined}
              customSortOptions={[
                { value: 'recently-visited', label: 'Recently Visited' },
                { value: 'rating', label: 'Rating' },
                { value: 'name', label: 'Name' },
                { value: 'distance', label: 'Distance' }
              ]}
            />
          ) : (
            <div className="w-10 h-10" />
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-4">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="restaurant-card">
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                    <div className="h-3 bg-muted rounded mb-2 w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredReviews.length > 0 ? (
            filteredReviews.map((review) => {
              const formatDate = (dateString: string) => {
                const date = new Date(dateString);
                return date.toISOString().split('T')[0]; // YYYY-MM-DD format
              };

              return (
                <Card 
                  key={review.id} 
                  className="restaurant-card cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/review/${review.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {/* Restaurant Name */}
                      <h3 className="font-medium text-lg">{review.restaurant?.name || 'Unknown Restaurant'}</h3>
                      
                      {/* Date */}
                      <p className="text-sm text-muted-foreground">{formatDate(review.created_at)}</p>
                      
                      {/* Rating with Stars - only if rating exists */}
                      {review.rating && review.rating > 0 && (
                        <div className="flex items-center">
                          {Array.from({ length: Math.ceil(review.rating) }, (_, i) => {
                            const starIndex = i + 1;
                            const isHalfStar = review.rating < starIndex && review.rating >= starIndex - 0.5;
                            
                            return (
                              <div key={i} className="relative">
                                {isHalfStar ? (
                                  <div className="relative">
                                    <Star className="h-4 w-4 text-muted-foreground" />
                                    <Star className="h-4 w-4 fill-current text-primary absolute top-0 left-0" style={{ clipPath: 'inset(0 50% 0 0)' }} />
                                  </div>
                                ) : (
                                  <Star className="h-4 w-4 fill-current text-primary" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Review Text - only if comment exists */}
                      {review.comment && review.comment.trim() && (
                        <p className="text-sm leading-relaxed line-clamp-1 whitespace-pre-line">{review.comment}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="restaurant-card">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No reviews yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default YourReviews;