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

const YourReviews = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  
  // Determine if viewing own reviews or someone else's
  const isOwnProfile = !id || id === user?.id;
  const profileUserId = id || user?.id;
  
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Sort reviews by most recently visited (default)
  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [reviews]);

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
          <div className="w-10 h-10" />
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
          ) : sortedReviews.length > 0 ? (
            sortedReviews.map((review) => {
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