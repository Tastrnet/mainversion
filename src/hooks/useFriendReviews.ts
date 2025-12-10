import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRelativeDate } from "@/lib/date-utils";

export const useFriendReviews = (limit: number = 30) => {
  const { user } = useAuth();
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Fetch reviews from friends
        const { data: reviews, error: reviewsError } = await supabase
          .from('reviews')
          .select('id, rating, comment, created_at, user_id, restaurant_id')
          .in('user_id', friendIds)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(limit);

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

        // Fetch restaurant data separately
        const { data: restaurants } = await supabase
          .from('restaurants')
          .select('id, name, address')
          .in('id', restaurantIds);

        // Fetch profile data separately  
        const { data: profiles } = await supabase
          .from('profiles')
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
            rating: review.rating,
            review: review.comment || '',
            reviewDate: formatRelativeDate(review.created_at),
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
  }, [user, limit]);

  return { recentReviews, loading };
};