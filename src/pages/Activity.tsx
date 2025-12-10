import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, List, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import HeaderBanner from "@/components/HeaderBanner";
import MobileNavigation from "@/components/MobileNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

const Activity = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* Fetch activities from people the user follows */
  useEffect(() => {
    const fetchActivities = async () => {
      if (!user) return;

      try {
        // Get list of people the user follows
        const { data: following } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', user.id);

        if (!following || following.length === 0) {
          setLoading(false);
          return;
        }

        const followingIds = following.map(f => f.following_id);

        // Fetch activities from followed users and own activities
        const { data: activitiesData, error } = await supabase
          .from('activities')
          .select('id, user_id, activity_type, related_id, metadata, created_at')
          .in('user_id', [...followingIds, user.id])
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error fetching activities:', error);
          setLoading(false);
          return;
        }

        // Fetch user profiles for all activities
        const userIds = [...new Set(activitiesData?.map(a => a.user_id) || [])];
        const { data: profiles } = await supabase
          .from('public_profiles')
          .select('user_id, username, full_name, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        // Fetch related content for each activity
        const enrichedActivities = await Promise.all(
          (activitiesData || []).map(async (activity) => {
            const profile = profileMap.get(activity.user_id);
            let relatedContent = null;

            if (activity.activity_type === 'review_created') {
              const { data: review } = await supabase
                .from('reviews')
                .select('id, restaurant_id, rating')
                .eq('id', activity.related_id)
                .maybeSingle();

              if (review) {
                const { data: restaurant } = await supabase
                  .from('restaurants')
                  .select('id, name')
                  .eq('id', review.restaurant_id)
                  .maybeSingle();

                relatedContent = {
                  type: 'review',
                  restaurant: restaurant?.name || 'Unknown Restaurant',
                  restaurantId: restaurant?.id,
                  rating: review.rating,
                  reviewId: review.id
                };
              }
            } else if (activity.activity_type === 'list_created') {
              const { data: list } = await supabase
                .from('lists')
                .select('id, name')
                .eq('id', activity.related_id)
                .maybeSingle();

              relatedContent = {
                type: 'list',
                listName: list?.name || 'Unknown List',
                listId: list?.id
              };
            } else if (activity.activity_type === 'list_liked') {
              const { data: list } = await supabase
                .from('lists')
                .select('id, name, user_id')
                .eq('id', activity.related_id)
                .maybeSingle();

              if (list) {
                const { data: listOwner } = await supabase
                  .from('public_profiles')
                  .select('username')
                  .eq('user_id', list.user_id)
                  .maybeSingle();

                relatedContent = {
                  type: 'list_like',
                  listName: list.name || 'Unknown List',
                  listId: list.id,
                  listOwner: listOwner?.username || 'Unknown'
                };
              }
            }

            return {
              ...activity,
              profile,
              relatedContent
            };
          })
        );

        setActivities(enrichedActivities.filter(a => a.relatedContent !== null));
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [user]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'review_created':
        return <Star className="h-4 w-4 text-primary" />;
      case 'list_created':
        return <List className="h-4 w-4 text-primary" />;
      case 'list_liked':
        return <Heart className="h-4 w-4 text-primary" />;
      default:
        return null;
    }
  };

  const getActivityText = (activity: any) => {
    const { activity_type, profile, relatedContent } = activity;

    if (activity_type === 'review_created') {
      return (
        <span>
          <span className="font-medium">{profile?.full_name || profile?.username}</span>
          {' visited '}
          <span className="font-medium">{relatedContent.restaurant}</span>
          {relatedContent.rating && (
            <span className="text-muted-foreground">
              {' '}• {relatedContent.rating.toFixed(1)} ★
            </span>
          )}
        </span>
      );
    } else if (activity_type === 'list_created') {
      return (
        <span>
          <span className="font-medium">{profile?.full_name || profile?.username}</span>
          {' created a list '}
          <span className="font-medium">{relatedContent.listName}</span>
        </span>
      );
    } else if (activity_type === 'list_liked') {
      return (
        <span>
          <span className="font-medium">{profile?.full_name || profile?.username}</span>
          {' liked '}
          <span className="font-medium">@{relatedContent.listOwner}</span>
          {"'s list "}
          <span className="font-medium">{relatedContent.listName}</span>
        </span>
      );
    }

    return null;
  };

  const handleActivityClick = (activity: any) => {
    const { activity_type, relatedContent } = activity;

    if (activity_type === 'review_created' && relatedContent.reviewId) {
      navigate(`/review/${relatedContent.reviewId}`);
    } else if (activity_type === 'list_created' && relatedContent.listId) {
      navigate(`/list/${relatedContent.listId}`);
    } else if (activity_type === 'list_liked' && relatedContent.listId) {
      navigate(`/list/${relatedContent.listId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />
      
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
            <h1 className="text-2xl font-medium">Activity</h1>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Card key={index} className="restaurant-card">
                  <CardContent className="p-4">
                    <div className="animate-pulse flex items-start space-x-3">
                      <div className="h-10 w-10 bg-muted rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/4"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <Card className="restaurant-card">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No recent activity from your friends.</p>
                <p className="text-sm text-muted-foreground mt-2">Follow friends to see their activity here!</p>
              </CardContent>
            </Card>
          ) : (
            activities.map((activity) => (
              <Card 
                key={activity.id} 
                className="restaurant-card cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleActivityClick(activity)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={activity.profile?.avatar_url} />
                      <AvatarFallback className="bg-muted">
                        {activity.profile?.full_name?.[0] || activity.profile?.username?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2 flex-1 min-w-0">
                          {getActivityIcon(activity.activity_type)}
                          <p className="text-sm leading-relaxed break-words">
                            {getActivityText(activity)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default Activity;