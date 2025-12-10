import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Star, User } from "lucide-react";
import MobileNavigation from "@/components/MobileNavigation";
import { supabase } from "@/integrations/supabase/client";

const AllFriends = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* Fetch friends data from database */
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      try {
        // Fetch user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('user_id', userId)
          .single();

        setProfile(profileData);

        // Get followers of this user
        const { data: followersData, error: followersError } = await (supabase as any)
          .from('followers')
          .select('follower_id, created_at')
          .eq('following_id', userId);

        // Get people this user is following  
        const { data: followingData, error: followingError } = await (supabase as any)
          .from('followers')
          .select('following_id, created_at')
          .eq('follower_id', userId);

        if (followersError || followingError) {
          console.error('Error fetching followers/following:', followersError || followingError);
          return;
        }

        // Combine followers and following into one list (removing duplicates)
        const allConnections = new Map();
        
        (followersData || []).forEach(follower => {
          allConnections.set(follower.follower_id, { 
            id: follower.follower_id, 
            created_at: follower.created_at 
          });
        });
        
        (followingData || []).forEach(following => {
          if (!allConnections.has(following.following_id)) {
            allConnections.set(following.following_id, { 
              id: following.following_id, 
              created_at: following.created_at 
            });
          }
        });

        const friendsData = Array.from(allConnections.values());

        // Get profile data for each connection
        const friendsWithProfiles = await Promise.all(
          friendsData.map(async (connection) => {
            const friendId = connection.id;
            
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
              connectedSince: new Date(connection.created_at).toLocaleDateString()
            };
          })
        );

        // Sort alphabetically by username
        const sortedFriends = friendsWithProfiles
          .filter(friend => friend !== null)
          .sort((a, b) => (a.username || '').localeCompare(b.username || ''));

        setFriends(sortedFriends);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center mb-2">
          <Button 
            onClick={() => navigate(-1)}
            variant="ghost" 
            size="icon"
            className="rounded-full mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <User className="h-5 w-5 mr-2 text-primary" />
            <div>
              <h1 className="text-2xl font-medium">All Friends</h1>
              {profile && (
                <p className="text-base text-muted-foreground truncate leading-tight">of @{profile.username}</p>
              )}
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground ml-12">{loading ? '...' : friends.length} friends</p>
      </div>

      <div className="p-4">
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <h1 className="tastr-logo text-3xl mb-4">tastr.</h1>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
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
                    <AvatarFallback className="bg-muted">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-base truncate leading-tight">@{friend.username}</h4>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      Connected since {friend.connectedSince}
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

export default AllFriends;