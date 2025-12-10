import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, TrendingUp, Star, MessageSquare, Check, X, Send, Reply, User } from "lucide-react";
import MobileNavigation from "@/components/MobileNavigation";
import FriendRequestCard from "@/components/FriendRequestCard";
import HeaderBanner from "@/components/HeaderBanner";
import ReviewCard from "@/components/ReviewCard";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFriendReviews } from "@/hooks/useFriendReviews";

const Friends = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const { recentReviews } = useFriendReviews(5); // Get 5 recent reviews for carousel
  
  const [popularRestaurants, setPopularRestaurants] = useState<any[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  /* Recent reviews data - replace with actual API call */

  // Force refresh to clear cached UserArrowLeft import error

  // Fetch popular restaurants from friends
  useEffect(() => {
    const fetchPopularFriends = async () => {
      if (!user) {
        setLoadingPopular(false);
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
          setPopularRestaurants([]);
          setLoadingPopular(false);
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
          setPopularRestaurants([]);
          setLoadingPopular(false);
          return;
        }

        // Get unique restaurant IDs from monthly reviews
        const restaurantIds = [...new Set(monthlyReviews.map(r => r.restaurant_id))];

        /* Fetch restaurant data */
        const { data: restaurantsData } = await supabase
          .from('restaurants')
          .select('id, name, address, cuisines')
          .in('id', restaurantIds);

        // Calculate ratings and visit counts from monthly reviews only
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

        setPopularRestaurants(sorted);
      } catch (error) {
        console.error('Error fetching popular friends:', error);
        setPopularRestaurants([]);
      } finally {
        setLoadingPopular(false);
      }
    };

    fetchPopularFriends();
  }, [user]);

  // Fetch friend requests and friends
  useEffect(() => {
    if (user) {
      fetchFriendData();
    }
  }, [user]);

  const fetchFriendData = async () => {
    if (!user) return;

    try {
      // For now, we'll use empty arrays since the friend request system needs to be implemented
      // The followers table only handles follow relationships, not friend requests
      const receivedRequestsData: any[] = [];
      const receivedError = null;

      setReceivedRequests([]);

      // For now, we'll use empty arrays since the friend request system needs to be implemented
      setSentRequests([]);

      // Fetch followers (people following the current user) using the existing followers table
      const { data: followersData, error: followersError } = await supabase
        .from('followers')
        .select('follower_id')
        .eq('following_id', user.id);

      if (followersError) {
        console.error('Error fetching followers:', followersError);
        setFriends([]);
      } else if (followersData && followersData.length > 0) {
        // Get profile info for each follower
        const followerIds = followersData.map(f => f.follower_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('public_profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', followerIds);

        if (!profilesError && profilesData) {
          const formattedFriends = profilesData.map(profile => ({
            id: profile.user_id,
            username: profile.username,
            avatar_url: profile.avatar_url
          }));
          setFriends(formattedFriends);
        } else {
          setFriends([]);
        }
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error('Error fetching friend data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    // Friend request functionality not implemented yet
    console.log('Cancel request not implemented:', requestId);
  };

  const handleAcceptRequest = async (requestId: string) => {
    // Friend request functionality not implemented yet
    console.log('Accept request not implemented:', requestId);
  };

  const handleDeclineRequest = async (requestId: string) => {
    // Friend request functionality not implemented yet
    console.log('Decline request not implemented:', requestId);
  };


  

  return (
    <div className="min-h-screen bg-background pb-24">
      <HeaderBanner />
      
      {/* Content with top padding for fixed banner */}
      <div className="safe-area-content">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center justify-center">
            <h1 className="text-2xl font-medium">Friends</h1>
          </div>
        </div>

        <div className="p-4 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">
                Add Friends
              </h2>
            </div>

              {/* Search Bar - Navigate to Add Friends page */}
              <div 
                className="mb-6 cursor-pointer"
                onClick={() => navigate('/add-friends')}
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search for users"
                    className="pl-10 rounded-xl cursor-pointer"
                    readOnly
                    onClick={() => navigate('/add-friends')}
                  />
                </div>
              </div>

              {/* Friend Requests - Received */}
              {receivedRequests.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center mb-3">
                    <h3 className="text-sm font-medium">Friend Requests ({receivedRequests.length})</h3>
                  </div>
                  <div className="space-y-3">
                    {receivedRequests.map((request) => (
                      <Card key={request.id} className="restaurant-card">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={request.sender_profile?.avatar_url} />
                                <AvatarFallback className="bg-muted">
                                  <User className="h-5 w-5 text-muted-foreground" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-base truncate leading-tight">@{request.sender_profile?.username || 'unknown'}</h4>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleAcceptRequest(request.id)}
                                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground h-8 w-8"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleDeclineRequest(request.id)}
                                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 border-secondary h-8 w-8"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Friend Requests - Sent */}
              {sentRequests.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center mb-3">
                    <h3 className="text-sm font-medium">Sent Requests ({sentRequests.length})</h3>
                  </div>
                  <div className="space-y-3">
                    {sentRequests.map((request) => (
                      <Card key={request.id} className="restaurant-card">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={request.receiver_profile?.avatar_url} />
                                <AvatarFallback className="bg-muted">
                                  <User className="h-5 w-5 text-muted-foreground" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-base truncate leading-tight">@{request.receiver_profile?.username || 'unknown'}</h4>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelRequest(request.id)}
                              className="border-muted-foreground text-muted-foreground hover:bg-muted hover:text-muted-foreground"
                            >
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </section>

          {!loadingPopular && popularRestaurants.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">
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
              <div className="flex gap-3 overflow-x-auto pb-2">
                {popularRestaurants.map((restaurant) => (
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
            </section>
          )}

          {recentReviews.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">
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
      </div>

      <MobileNavigation />
    </div>
  );
};

export default Friends;