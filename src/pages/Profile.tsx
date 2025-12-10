import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Heart, List, UserPlus, UserMinus, Star, User, Bookmark, MessageCircle, UserCheck, Clock, ArrowLeft } from "lucide-react";
import MobileNavigation from "@/components/MobileNavigation";
import HeaderBanner from "@/components/HeaderBanner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { id } = useParams();
  
  // Determine if this is viewing own profile or someone else's
  const isOwnProfile = !id || id === authUser?.id;
  const profileUserId = id || authUser?.id;

  const [profile, setProfile] = useState<any>(null);
  const [userStats, setUserStats] = useState({ restaurants: 0, followers: 0, following: 0 });
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authStateLoading, setAuthStateLoading] = useState(false);
  const [followStatus, setFollowStatus] = useState<'none' | 'following' | 'follow_back'>('none');

  /* Mock data - this should be replaced with Supabase data */
  const mockUserStats = { restaurants: 12, followers: 8, following: 3 };
  const mockRecentVisits = [
    { reviewId: 1, id: 1, name: "Pizza Margherita", rating: 4.5, date: "2 days ago" },
    { reviewId: 2, id: 2, name: "Burger House", rating: 4.2, date: "1 week ago" },
    { reviewId: 3, id: 3, name: "Sushi Bar", rating: 4.8, date: "2 weeks ago" },
    { reviewId: 4, id: 4, name: "Taco Corner", rating: 4.0, date: "3 weeks ago" }
  ];

  // Check follow status for other user's profiles
  const checkFollowStatus = async () => {
    if (!authUser?.id || !profileUserId || isOwnProfile) return;

    try {
      // Check if current user is following this profile user
      const { data: isFollowing } = await (supabase as any)
        .from('followers')
        .select('id')
        .eq('follower_id', authUser.id)
        .eq('following_id', profileUserId)
        .maybeSingle();

      // Check if profile user is following current user (for "follow back")
      const { data: isFollowingBack } = await (supabase as any)
        .from('followers')
        .select('id')
        .eq('follower_id', profileUserId)
        .eq('following_id', authUser.id)
        .maybeSingle();

      if (isFollowing) {
        setFollowStatus('following');
      } else if (isFollowingBack) {
        setFollowStatus('follow_back');
      } else {
        setFollowStatus('none');
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  // Handle follow actions
  const handleFollowAction = async () => {
    if (!authUser?.id || !profileUserId || isOwnProfile) return;

    try {
      if (followStatus === 'following') {
        // Unfollow
        const { error } = await (supabase as any)
          .from('followers')
          .delete()
          .eq('follower_id', authUser.id)
          .eq('following_id', profileUserId);

        if (error) throw error;
        
        // Check if they still follow us back to set correct status
        const { data: isFollowingBack } = await (supabase as any)
          .from('followers')
          .select('id')
          .eq('follower_id', profileUserId)
          .eq('following_id', authUser.id)
          .maybeSingle();
          
        setFollowStatus(isFollowingBack ? 'follow_back' : 'none');
        
      } else {
        // Follow
        const { error } = await (supabase as any)
          .from('followers')
          .insert({
            follower_id: authUser.id,
            following_id: profileUserId
          });

        if (error) throw error;
        setFollowStatus('following');
      }
    } catch (error) {
      console.error('Error handling follow action:', error);
    }
  };

  const getFollowButtonContent = () => {
    switch (followStatus) {
      case 'none':
        return {
          text: "Follow",
          className: "btn-primary"
        };
      case 'follow_back':
        return {
          text: "Follow back",
          className: "btn-primary"
        };
      case 'following':
        return {
          text: "Following",
          className: "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        };
    }
  };

  // Fetch user profile and data from Supabase
  useEffect(() => {
    const fetchUserData = async () => {
      if (!profileUserId) return;

      try {
        // Determine if viewing own profile or another user's profile
        const isOwnProfile = authUser?.id === profileUserId;
        
        let profileData;
        
        if (isOwnProfile) {
          // Fetch full profile for own profile
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', profileUserId)
            .single();
          profileData = data;
        } else {
          // Fetch public profile for other users (protects sensitive data)
          const { data } = await supabase
            .from('public_profiles')
            .select('*')
            .eq('user_id', profileUserId)
            .single();
          profileData = data;
        }

        if (profileData) {
          setProfile(profileData);
        }

        // Fetch user stats - count unique restaurants visited
        const { data: reviews } = await supabase
          .from('reviews')
          .select('restaurant_id')
          .eq('user_id', profileUserId);
        
        const uniqueRestaurantCount = reviews ? new Set(reviews.map(r => r.restaurant_id)).size : 0;

        // Get followers count (people following this user)
        const { data: followersData } = await (supabase as any)
          .from('followers')
          .select('id')
          .eq('following_id', profileUserId);

        // Get following count (people this user follows)
        const { data: followingData } = await (supabase as any)
          .from('followers')
          .select('id')
          .eq('follower_id', profileUserId);

        setUserStats({
          restaurants: uniqueRestaurantCount,
          followers: followersData?.length || 0,
          following: followingData?.length || 0
        });


        // Fetch recent visits (recent reviews)
        const { data: recentReviews } = await supabase
          .from('reviews')
          .select('id, rating, created_at, restaurant_id')
          .eq('user_id', profileUserId)
          .order('created_at', { ascending: false })
          .limit(4);

        if (recentReviews && recentReviews.length > 0) {
          // Get restaurant names for the reviews
          const restaurantIds = recentReviews.map(review => review.restaurant_id);
          const { data: restaurantData } = await supabase
            .from('restaurants')
            .select('id, name')
            .in('id', restaurantIds);

          const restaurantMap = new Map(restaurantData?.map(r => [r.id, r.name]));

          const visits = recentReviews.map(review => ({
            reviewId: review.id,
            id: review.restaurant_id,
            name: restaurantMap.get(review.restaurant_id) || 'Unknown Restaurant',
            rating: review.rating,
            date: new Date(review.created_at).toISOString().split('T')[0] // YYYY-MM-DD format
          }));
          setRecentVisits(visits);
        }

        // Check follow status if viewing someone else's profile
        if (!isOwnProfile && authUser?.id) {
          await checkFollowStatus();
        }

      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fall back to mock data if there's an error
        setProfile({
          username: 'user',
          bio: "Food enthusiast and restaurant explorer. Love trying new cuisines!",
          avatar_url: null
        });
        setUserStats(mockUserStats);
        setRecentVisits(mockRecentVisits);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [profileUserId, authUser?.id, isOwnProfile]);

  // Listen for auth state changes and refresh profile (only for own profile)
  useEffect(() => {
    if (!isOwnProfile) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'USER_UPDATED' && session?.user && authUser) {
          // Auth user metadata was updated, refresh the profile
          setAuthStateLoading(true);
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', authUser.id)
              .single();

            if (profileData) {
              setProfile(profileData);
            }
          } catch (error) {
            console.error('Error refreshing profile after auth update:', error);
          } finally {
            setAuthStateLoading(false);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [authUser, isOwnProfile]);

  // Listen for profile updates and refresh data (only for own profile)
  useEffect(() => {
    if (!isOwnProfile) return;

    const handleFocus = () => {
      // Refetch data when user returns to this page
      if (authUser) {
        const fetchUserData = async () => {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', authUser.id)
              .single();

            if (profileData) {
              setProfile(profileData);
            }
          } catch (error) {
            console.error('Error refetching profile:', error);
          }
        };
        fetchUserData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [authUser, isOwnProfile]);

  // Real-time updates for followers/following counts
  useEffect(() => {
    if (!profileUserId) return;

    const channel = supabase
      .channel('followers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'followers',
          filter: `follower_id=eq.${profileUserId}`
        },
        async () => {
          // Refetch following count when this user follows/unfollows someone
          const { data: followingData } = await (supabase as any)
            .from('followers')
            .select('id')
            .eq('follower_id', profileUserId);

          setUserStats(prev => ({
            ...prev,
            following: followingData?.length || 0
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'followers',
          filter: `following_id=eq.${profileUserId}`
        },
        async () => {
          // Refetch followers count when someone follows/unfollows this user
          const { data: followersData } = await (supabase as any)
            .from('followers')
            .select('id')
            .eq('following_id', profileUserId);

          setUserStats(prev => ({
            ...prev,
            followers: followersData?.length || 0
          }));

          // Also recheck follow status if viewing someone else's profile
          if (!isOwnProfile) {
            await checkFollowStatus();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileUserId, isOwnProfile]);

  const user = {
    name: profile?.username ? `@${profile.username}` : "Loading...",
    username: profile?.username ? `@${profile.username}` : "Loading...",
    bio: profile?.bio || "",
    stats: userStats
  };

  const followButton = getFollowButtonContent();

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />
      
      {/* Content with top padding for fixed banner */}
      <div className="safe-area-content">
        {/* Header for other user's profiles */}
        {!isOwnProfile && (
          <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
            <div className="flex items-center justify-center">
              <Button 
                onClick={() => navigate(-1)}
                variant="ghost" 
                size="icon"
                className="rounded-full absolute left-4"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-medium">Profile</h1>
            </div>
          </div>
        )}

        <div className="p-4 space-y-6">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <h1 className="tastr-logo text-3xl mb-4">tastr.</h1>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Profile Content */}
          {!loading && (
            <>
              {/* Profile Header */}
              <Card className="restaurant-card">
                <CardContent className="p-6 text-center relative">
                  {isOwnProfile && (
                    <Button 
                      onClick={() => navigate("/settings")}
                      variant="ghost" 
                      size="icon"
                      className="rounded-full absolute top-4 right-4"
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  )}
                  <div className="w-16 h-16 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <h2 className="text-xl font-medium mb-4 truncate px-2 max-w-full overflow-hidden">
                    {authStateLoading ? "Loading..." : `@${profile?.username || "username"}`}
                  </h2>
                  
                  {profile?.bio && (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{profile.bio}</p>
                  )}

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div 
                      className="text-center cursor-pointer rounded-lg p-2"
                      onClick={() => isOwnProfile ? navigate('/visited-restaurants') : navigate(`/visited-restaurants/${profileUserId}`)}
                    >
                      <div className="text-xl font-medium">{userStats.restaurants}</div>
                      <div className="text-xs text-muted-foreground">Restaurants</div>
                    </div>
                    <div 
                      className="text-center cursor-pointer rounded-lg p-2"
                      onClick={() => navigate(`/followers/${profileUserId}`)}
                    >
                      <div className="text-xl font-medium">{userStats.followers}</div>
                      <div className="text-xs text-muted-foreground">Followers</div>
                    </div>
                    <div 
                      className="text-center cursor-pointer rounded-lg p-2"
                      onClick={() => navigate(`/following/${profileUserId}`)}
                    >
                      <div className="text-xl font-medium">{userStats.following}</div>
                      <div className="text-xs text-muted-foreground">Following</div>
                    </div>
                  </div>

                  {!isOwnProfile && (
                    <Button 
                      onClick={handleFollowAction}
                      className={followButton.className}
                    >
                      {followButton.text}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <Button 
                  onClick={() => navigate(isOwnProfile ? "/your-reviews" : `/your-reviews/${profileUserId}`)}
                  variant="outline"
                  size="icon"
                  className="w-12 h-12"
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>
                
                <Button 
                  onClick={() => navigate(isOwnProfile ? "/want-to-try" : `/want-to-try/${profileUserId}`)}
                  variant="outline"
                  size="icon"
                  className="w-12 h-12"
                >
                  <Bookmark className="h-5 w-5" />
                </Button>
                
                <Button 
                  onClick={() => navigate(isOwnProfile ? "/favorites" : `/favorites/${profileUserId}`)}
                  variant="outline"
                  size="icon"
                  className="w-12 h-12"
                >
                  <Heart className="h-5 w-5" />
                </Button>
                
                <Button 
                  onClick={() => navigate(isOwnProfile ? "/lists" : `/lists/${profileUserId}`)}
                  variant="outline"
                  size="icon"
                  className="w-12 h-12"
                >
                  <List className="h-5 w-5" />
                </Button>
              </div>


              {/* Recent Visits - Only show if user has visits */}
              {recentVisits.length > 0 && (
                <section>
                  <h2 className="text-lg font-medium mb-3">Recent Visits</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {recentVisits.map((visit) => (
                      <Card 
                        key={visit.reviewId} 
                        className="restaurant-card cursor-pointer"
                        onClick={() => navigate(`/review/${visit.reviewId}`)}
                      >
                        <CardContent className="p-3">
                          <div className="space-y-1">
                            {/* Restaurant Name */}
                            <h4 className="font-medium text-sm text-center truncate">{visit.name}</h4>
                            
                            {/* Date */}
                            <p className="text-xs text-center text-muted-foreground">{visit.date}</p>
                            
                            {/* Rating - only if it exists */}
                            {visit.rating && visit.rating > 0 && (
                              <div className="flex items-center justify-center">
                                <Star className="h-3 w-3 text-primary mr-1 fill-current" />
                                <span className="text-xs text-muted-foreground">{visit.rating}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default Profile;