import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Users, User } from "lucide-react";
import MobileNavigation from "@/components/MobileNavigation";
import HeaderBanner from "@/components/HeaderBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Followers = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user: authUser } = useAuth();
  const [followers, setFollowers] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* Fetch followers data from database */
  useEffect(() => {
    const fetchFollowers = async () => {
      if (!userId) return;

      try {
        // Get profile data for the user whose followers we're viewing
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', userId)
          .single();

        setProfileData(profile);

        // Get all users who follow this user
        const { data: followersData, error } = await (supabase as any)
          .from('followers')
          .select('follower_id, created_at')
          .eq('following_id', userId);

        if (error) {
          console.error('Error fetching followers:', error);
          return;
        }

        // Get profile data for each follower
        const followersWithProfiles = await Promise.all(
          (followersData || []).map(async (follower) => {
            const { data: profileData, error: profileError } = await supabase
              .from('public_profiles')
              .select('user_id, username, avatar_url')
              .eq('user_id', follower.follower_id)
              .single();

            if (profileError) {
              console.error('Error fetching follower profile:', profileError);
              return null;
            }

            return {
              id: follower.follower_id,
              username: profileData.username,
              avatar_url: profileData.avatar_url,
              followedSince: new Date(follower.created_at).toLocaleDateString()
            };
          })
        );

        setFollowers(followersWithProfiles.filter(follower => follower !== null));
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowers();
  }, [userId]);

  const isOwnProfile = userId === authUser?.id;

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />
      
      {/* Content with top padding for fixed banner */}
      <div className="safe-area-content">
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
            <h1 className="text-2xl font-medium">Followers</h1>
          </div>
        </div>

        <div className="p-4">
          <div className="space-y-4">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="restaurant-card">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback></AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded animate-pulse mb-1"></div>
                        <div className="h-3 bg-muted rounded animate-pulse w-32"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : followers.length > 0 ? followers.map((follower) => (
              <Card 
                key={follower.id} 
                className="restaurant-card cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/profile/${follower.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={follower.avatar_url} />
                      <AvatarFallback className="bg-muted">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium truncate">
                        @{follower.username}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">
                  {isOwnProfile ? "No followers yet" : `@${profileData?.username} has no followers`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default Followers;