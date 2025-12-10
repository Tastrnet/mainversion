import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, ArrowLeft, User } from "lucide-react";
import MobileNavigation from "@/components/MobileNavigation";
import HeaderBanner from "@/components/HeaderBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const AddFriends = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [followStatuses, setFollowStatuses] = useState<{[key: string]: 'none' | 'following' | 'follow_back'}>({});

  // Auto-focus search input when page loads
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Search for users in the database
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setFollowStatuses({});
      return;
    }

    if (!user) return;

    setIsSearching(true);
    
    try {
      const { data: profiles, error } = await supabase
        .from('public_profiles')
        .select('user_id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .neq('user_id', user.id) // Exclude current user from results
        .limit(10);

      if (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
        setFollowStatuses({});
      } else {
        setSearchResults(profiles || []);
        
        // Check follow status for each user
        if (profiles && profiles.length > 0) {
          await checkFollowStatuses(profiles.map(p => p.user_id));
        } else {
          setFollowStatuses({});
        }
      }
    } catch (error) {
      console.error('Exception while searching:', error);
      setSearchResults([]);
      setFollowStatuses({});
    } finally {
      setIsSearching(false);
    }
  };

  // Check follow status for multiple users
  const checkFollowStatuses = async (userIds: string[]) => {
    if (!user) return;

    try {
      const statusMap: {[key: string]: 'none' | 'following' | 'follow_back'} = {};

      // Initialize all users as 'none'
      userIds.forEach(userId => {
        statusMap[userId] = 'none';
      });

      // Check if current user is following any of these users
      const { data: followingData } = await (supabase as any)
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', userIds);

      // Check if any of these users are following the current user (for "follow back")
      const { data: followersData } = await (supabase as any)
        .from('followers')
        .select('follower_id')
        .eq('following_id', user.id)
        .in('follower_id', userIds);

      // Create sets for quick lookup
      const followingSet = new Set((followingData || []).map(f => f.following_id));
      const followersSet = new Set((followersData || []).map(f => f.follower_id));

      // Update status based on follow relationships
      userIds.forEach(userId => {
        if (followingSet.has(userId)) {
          statusMap[userId] = 'following';
        } else if (followersSet.has(userId)) {
          statusMap[userId] = 'follow_back';
        } else {
          statusMap[userId] = 'none';
        }
      });

      setFollowStatuses(statusMap);
    } catch (error) {
      console.error('Error checking follow statuses:', error);
    }
  };

  // Search when query changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleFollowAction = async (targetUserId: string) => {
    if (!user) return;

    const currentStatus = followStatuses[targetUserId] || 'none';
    
    try {
      if (currentStatus === 'following') {
        // Unfollow
        const { error } = await (supabase as any)
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) throw error;
        
        // Check if they still follow us back to set correct status
        const { data: isFollowingBack } = await (supabase as any)
          .from('followers')
          .select('id')
          .eq('follower_id', targetUserId)
          .eq('following_id', user.id)
          .maybeSingle();
          
        setFollowStatuses(prev => ({
          ...prev,
          [targetUserId]: isFollowingBack ? 'follow_back' : 'none'
        }));
        
      } else {
        // Follow
        const { error } = await (supabase as any)
          .from('followers')
          .insert({
            follower_id: user.id,
            following_id: targetUserId
          });

        if (error) throw error;
        
        setFollowStatuses(prev => ({
          ...prev,
          [targetUserId]: 'following'
        }));
      }
    } catch (error) {
      console.error('Error handling follow action:', error);
    }
  };

  const getFollowButtonContent = (userId: string) => {
    const status = followStatuses[userId] || 'none';
    
    switch (status) {
      case 'none':
        return {
          text: "Follow",
          className: "bg-primary text-primary-foreground hover:bg-primary/90"
        };
      case 'follow_back':
        return {
          text: "Follow back",
          className: "bg-primary text-primary-foreground hover:bg-primary/90"
        };
      case 'following':
        return {
          text: "Following",
          className: "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        };
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />
      
      {/* Content with top padding for fixed banner */}
      <div className="safe-area-content">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center justify-center">
            <Button 
              onClick={() => navigate("/friends")}
              variant="ghost" 
              size="icon"
              className="rounded-full absolute left-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-medium">Add Friends</h1>
          </div>
        </div>

        <div className="p-4">
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search for users"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </div>
          {/* Search Results */}
          {searchQuery && (
            <div>
              <h3 className="text-sm font-medium mb-4">
                {isSearching ? "Searching..." : `Search Results (${searchResults.length})`}
              </h3>
              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((profile) => (
                    <Card 
                      key={profile.user_id} 
                      className="restaurant-card cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/profile/${profile.user_id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <Avatar className="h-12 w-12 flex-shrink-0">
                              <AvatarImage src={profile.avatar_url} />
                              <AvatarFallback className="bg-muted">
                                <User className="h-6 w-6 text-muted-foreground" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate leading-tight">@{profile.username}</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            className={`flex-shrink-0 ${getFollowButtonContent(profile.user_id).className}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFollowAction(profile.user_id);
                            }}
                          >
                            {getFollowButtonContent(profile.user_id).text}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : !isSearching ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No users found</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default AddFriends;