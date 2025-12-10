import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileNavigation from "@/components/MobileNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const YourFriends = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* Fetch friends data from database */
  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;

      try {
        // Get followers where current user is following someone or being followed
        const { data: followersData, error } = await supabase
          .from('followers')
          .select('follower_id, following_id, created_at')
          .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`);

        if (error) {
          console.error('Error fetching followers:', error);
          return;
        }

        // Get profile data for each friend and deduplicate
        const friendIds = new Set<string>();
        const friendsWithProfiles = await Promise.all(
          (followersData || []).map(async (follow) => {
            const friendId = follow.follower_id === user.id ? follow.following_id : follow.follower_id;
            
            // Skip if we've already processed this friend
            if (friendIds.has(friendId)) {
              return null;
            }
            friendIds.add(friendId);
            
            const { data: profileData, error: profileError } = await supabase
              .from('public_profiles')
              .select('user_id, username, avatar_url')
              .eq('user_id', friendId)
              .single();

            if (profileError) {
              console.error('Error fetching friend profile:', profileError);
              return null;
            }

            return {
              id: friendId,
              username: profileData.username,
              avatar_url: profileData.avatar_url,
              joinedDate: new Date(follow.created_at).toLocaleDateString(),
              mutualFriends: 0 // Placeholder for now
            };
          })
        );

        setFriends(friendsWithProfiles.filter(friend => friend !== null));
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center mb-2">
          <Button 
            onClick={() => navigate("/friends")}
            variant="ghost" 
            size="icon"
            className="rounded-full mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-primary" />
            <h1 className="text-2xl font-medium">Your Friends</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground ml-12">{loading ? '...' : friends.length} friends</p>
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
          ) : friends.length > 0 ? friends.map((friend) => (
            <Card 
              key={friend.id} 
              className="restaurant-card cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/profile/${friend.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={friend.avatar_url} />
                    <AvatarFallback>
                      {friend.username?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-base truncate leading-tight">@{friend.username}</h4>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      Connected since {friend.joinedDate}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )) : (
            <Card className="restaurant-card">
              <CardContent className="p-6 text-center">
                <h4 className="font-medium text-sm mb-2">No friends yet</h4>
                <p className="text-xs text-muted-foreground">
                  Start adding friends to see them here!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default YourFriends;