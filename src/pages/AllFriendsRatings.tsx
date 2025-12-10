import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Star, User } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import MobileNavigation from "@/components/MobileNavigation";
import HeaderBanner from "@/components/HeaderBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RestaurantReviewFilterButton, { RestaurantReviewFilterOptions } from "@/components/RestaurantReviewFilterButton";

const AllFriendsRatings = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<RestaurantReviewFilterOptions>({
    sortBy: 'newest',
    hasRating: 'any',
    ratingRange: [0.5, 5],
    timePeriod: 'all',
    showFrom: 'everyone'
  });

  useEffect(() => {
    const fetchFriendReviews = async () => {
      if (!user || !id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch restaurant details - parse URL param to number
        const { data: restaurantData } = await supabase
          .from('restaurants')
          .select('id, name, address')
          .eq('id', Number(id)) // Parse string ID from URL to number
          .single();

        setRestaurant(restaurantData);

        // Get user's following list
        const { data: followingData } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = followingData?.map(f => f.following_id) || [];

        if (followingIds.length === 0) {
          setReviews([]);
          setLoading(false);
          return;
        }

        // Fetch reviews from friends - parse URL param to number  
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('id, rating, comment, created_at, user_id, restaurant_id, is_hidden, food_rating, drinks_rating, service_rating, atmosphere_rating, value_for_money_rating')
          .eq('restaurant_id', Number(id)) // Parse string ID from URL to number
          .in('user_id', followingIds)
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

        // Get profile data for reviewers
        const userIds = reviewsData.map(review => review.user_id);
        const { data: profilesData } = await supabase
          .from('public_profiles')
          .select('user_id, username, full_name, avatar_url')
          .in('user_id', userIds);

        // Create profile map for quick lookup
        const profileMap = new Map(profilesData?.map(p => [p.user_id, p]));

        // Combine review data with profile data
        const reviewsWithProfiles = reviewsData.map(review => ({
          ...review,
          restaurant: restaurantData,
          reviewer: profileMap.get(review.user_id)
        }));

        setReviews(reviewsWithProfiles);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriendReviews();
  }, [user, id]);

  // Filter and sort reviews
  const filteredReviews = useMemo(() => {
    let filtered = [...reviews];

    // Filter by show (Anyone/Friends/You)
    // For this page, it's already showing friends, so we just apply the showFrom
    if (filters.showFrom === 'you') {
      // Only current user
      filtered = filtered.filter(review => review.user_id === user?.id);
    }
    // If showFrom is 'friends' or 'anyone', show all (since this page already filters by friends)

    // Filter by rating
    if (filters.hasRating === 'rated') {
      filtered = filtered.filter(review => {
        const rating = review.rating;
        return rating !== null && rating !== undefined && rating >= filters.ratingRange[0] && rating <= filters.ratingRange[1];
      });
    }

    // Filter by time period
    if (filters.timePeriod !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filters.timePeriod) {
        case '24h':
          cutoffDate.setHours(now.getHours() - 24);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(review => 
        new Date(review.created_at) >= cutoffDate
      );
    }

    // Sort reviews
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'rating':
          if (b.rating !== a.rating) {
            return (b.rating || 0) - (a.rating || 0);
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [reviews, filters]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />
      
      {/* Content with top padding for fixed banner */}
      <div className="safe-area-content">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center justify-center">
            <Button 
              onClick={() => navigate(`/restaurant/${id}`)}
              variant="ghost" 
              size="icon"
              className="rounded-full absolute left-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-medium">Friend Reviews</h1>
          </div>
          {restaurant && (
            <p className="text-sm text-muted-foreground text-center mt-1">{restaurant.name}</p>
          )}
        </div>

        {reviews.length > 0 && (
          <div className="p-4 pb-2 flex justify-end">
            <RestaurantReviewFilterButton
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>
        )}

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
                    className="restaurant-card hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/review/${review.id}`)}
                  >
                    <CardContent className="p-4">
                      <div 
                        className="flex items-start space-x-3 mb-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/user/${review.user_id}`);
                        }}
                      >
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={review.reviewer?.avatar_url} />
                          <AvatarFallback className="bg-muted">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            @{review.reviewer?.username || 'Unknown User'}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Overall Rating with Stars */}
                        {review.rating && review.rating > 0 && (
                          <div className="flex items-center">
                            {Array.from({ length: Math.ceil(review.rating) }, (_, i) => {
                              const starIndex = i + 1;
                              const isHalfStar = review.rating < starIndex && review.rating >= starIndex - 0.5;
                              
                              return (
                                <div key={i} className="relative inline-flex">
                                  {isHalfStar ? (
                                    <>
                                      <Star className="h-4 w-4 fill-muted" strokeWidth={0} />
                                      <div className="absolute top-0 left-0 overflow-hidden w-1/2">
                                        <Star className="h-4 w-4 fill-primary" strokeWidth={0} />
                                      </div>
                                    </>
                                  ) : (
                                    <Star className="h-4 w-4 fill-primary" strokeWidth={0} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Review Text - only if comment exists */}
                        {review.comment && review.comment.trim() && (
                          <p className="text-sm leading-relaxed">{review.comment}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : null}
          </div>
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default AllFriendsRatings;