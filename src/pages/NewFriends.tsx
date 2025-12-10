import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReviewFilterOptions } from "@/components/ReviewFilterButton";
import { ArrowLeft, Star, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileNavigation from "@/components/MobileNavigation";
import HeaderBanner from "@/components/HeaderBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { formatRelativeDate } from '@/lib/date-utils';

const NewFriends = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [allCuisines, setAllCuisines] = useState<any[]>([]);
  
  // Filter states
  const [filters, setFilters] = useState<ReviewFilterOptions>({
    sortBy: 'newest',
    cuisines: 'Any',
    hasRating: 'any',
    ratingRange: [0.5, 5],
    timePeriod: 'all',
    userId: 'all'
  });

  // Star rating component
  const StarRating = ({ rating }: { rating: number }) => {
    if (!rating) return null;
    
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`full-${i}`} className="h-3 w-3 text-primary fill-current" />
      );
    }
    
    // Add half star if needed
    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative h-3 w-3">
          <Star className="h-3 w-3 text-primary fill-current" style={{ clipPath: 'inset(0 50% 0 0)' }} />
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-0.5">
        {stars}
      </div>
    );
  };

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

  useEffect(() => {
    const fetchFriendReviews = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get people the current user is following
        const { data: following, error: followingError } = await (supabase as any)
          .from('followers')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followingError) {
          console.error('Error fetching following:', followingError);
          setLoading(false);
          return;
        }

        // Extract following user IDs
        const friendIds = (following || []).map(follow => follow.following_id);

        if (friendIds.length === 0) {
          setRecentReviews([]);
          setLoading(false);
          return;
        }

        // Fetch ALL reviews from friends - simplified query without foreign key joins
        const { data: reviews, error: reviewsError } = await supabase
          .from('reviews')
          .select('id, rating, comment, created_at, user_id, restaurant_id')
          .in('user_id', friendIds)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(30);

        if (reviewsError) {
          console.error('Error fetching reviews:', reviewsError);
          setLoading(false);
          return;
        }

        if (!reviews || reviews.length === 0) {
          setRecentReviews([]);
          setLoading(false);
          return;
        }

        // Get unique restaurant IDs and user IDs from the reviews
        const restaurantIds = [...new Set(reviews.map(r => r.restaurant_id))];
        const userIds = [...new Set(reviews.map(r => r.user_id))];

        /* Fetch restaurant data separately with cuisines */
        const { data: restaurants } = await supabase
          .from('restaurants')
          .select('id, name, address, cuisines')
          .in('id', restaurantIds);

        // Get profile data separately  
        const { data: profiles } = await supabase
          .from('public_profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);

        // Format the reviews data by joining with fetched data
        const formattedReviews = (reviews || []).map((review: any) => {
          const restaurant = restaurants?.find(r => r.id === review.restaurant_id);
          const profile = profiles?.find(p => p.user_id === review.user_id);

          return {
            id: review.id,
            user: profile?.username || 'Anonymous',
            username: profile?.username || 'anonymous',
            userId: review.user_id,
            restaurant: restaurant?.name || 'Unknown Restaurant',
            restaurantId: review.restaurant_id,
            restaurantCuisines: restaurant?.cuisines || [],
            rating: review.rating,
            review: review.comment || 'No comment provided',
            reviewDate: formatRelativeDate(review.created_at),
            createdAt: review.created_at,
            avatarUrl: profile?.avatar_url
          };
        });

        setRecentReviews(formattedReviews);
      } catch (error) {
        console.error('Error fetching friend reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriendReviews();
  }, [user]);

  // Filter and sort reviews
  const filteredReviews = useMemo(() => {
    let filtered = [...recentReviews];

    // Filter by user
    if (filters.userId !== 'all') {
      filtered = filtered.filter(review => review.userId === filters.userId);
    }

    /* Filter by category (cuisines) - hierarchical filtering */
    if (filters.cuisines !== 'Any') {
      const selectedCuisine = filters.cuisines.trim();
      
      // Find all cuisine names that match or are children of the selected cuisine
      const matchingCuisineNames = new Set<string>();
      
      allCuisines.forEach(cuisine => {
        // Exact match
        if (cuisine.name === selectedCuisine) {
          matchingCuisineNames.add(cuisine.name);
        } else {
          // Check if selected cuisine appears in any category level of this cuisine (hierarchical match)
          for (let i = 1; i <= 5; i++) {
            if (cuisine[`cuisine_category_${i}`] === selectedCuisine) {
              matchingCuisineNames.add(cuisine.name);
              break;
            }
          }
        }
      });
      
      filtered = filtered.filter(review => {
        if (!review.restaurantCuisines || !Array.isArray(review.restaurantCuisines)) return false;
        // Check if any of the restaurant's cuisines match the selected cuisine or its children
        return review.restaurantCuisines.some((cuisine: string) => 
          matchingCuisineNames.has(cuisine.trim())
        );
      });
    }

    // Filter by rating
    if (filters.hasRating === 'rated') {
      filtered = filtered.filter(review => {
        const rating = review.rating;
        return rating !== null && rating !== undefined && rating >= filters.ratingRange[0] && rating <= filters.ratingRange[1];
      });
    } else if (filters.hasRating === 'not-rated') {
      filtered = filtered.filter(review => review.rating === null || review.rating === undefined);
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
        new Date(review.createdAt) >= cutoffDate
      );
    }

    // Sort reviews
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'rating':
          if (b.rating !== a.rating) {
            return (b.rating || 0) - (a.rating || 0);
          }
          // Secondary sort by newest when ratings are equal
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          if (a.restaurant !== b.restaurant) {
            return a.restaurant.localeCompare(b.restaurant);
          }
          // Secondary sort by newest when names are equal
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [recentReviews, filters]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <HeaderBanner />
        
        {/* Content with top padding for fixed banner */}
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
            <h1 className="text-2xl font-medium">New from Friends</h1>
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
      
      {/* Content with top padding for fixed banner */}
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
          <h1 className="text-2xl font-medium">New from Friends</h1>
        </div>
      </div>

        <div className="p-4">
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <Card 
                key={review.id} 
                className="review-card cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/review/${review.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3 mb-3">
                    <div 
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg cursor-pointer hover:scale-110 transition-transform overflow-hidden flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/user/${review.userId}`);
                      }}
                    >
                      {review.avatarUrl ? (
                        <img 
                          src={review.avatarUrl} 
                          alt={review.user} 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        className="font-medium text-sm truncate hover:text-primary transition-colors text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/restaurant/${review.restaurantId}`);
                        }}
                      >
                        {review.restaurant}
                      </button>
                      <button 
                        className="text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors block"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/user/${review.userId}`);
                        }}
                      >
                        @{review.username}
                      </button>
                    </div>
                    <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                      <StarRating rating={review.rating} />
                      <span className="text-xs text-muted-foreground">{review.reviewDate}</span>
                    </div>
                  </div>
                  
                  {review.review && review.review !== 'No comment provided' && review.review.trim() && (
                    <p className="text-sm text-foreground leading-relaxed">
                      {review.review.length > 150 ? `${review.review.substring(0, 147)}...` : review.review}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default NewFriends;