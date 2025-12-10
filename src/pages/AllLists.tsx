import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, List, Lock, Globe } from "lucide-react";
import MobileNavigation from "@/components/MobileNavigation";
import { supabase } from "@/integrations/supabase/client";

const AllLists = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [lists, setLists] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* Fetch lists data from database */
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      try {
        // Fetch user profile
        const { data: profileData } = await supabase
          .from('public_profiles')
          .select('full_name, username, avatar_url')
          .eq('user_id', userId)
          .single();

        setProfile(profileData);

        // Fetch lists with restaurant count
        const { data: listsData, error } = await supabase
          .from('lists')
          .select(`
            id,
            name,
            description,
            is_public,
            created_at,
            list_restaurants (count)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching lists:', error);
        } else {
          setLists(listsData || []);
        }
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
            <List className="h-5 w-5 mr-2 text-primary" />
            <div>
              <h1 className="text-2xl font-medium">All Lists</h1>
              {profile && (
                <p className="text-base text-muted-foreground truncate leading-tight">by {profile.full_name}</p>
              )}
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground ml-12">{loading ? '...' : lists.length} lists</p>
      </div>

      <div className="p-4">
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <h1 className="tastr-logo text-3xl mb-4">tastr.</h1>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : lists.length > 0 ? lists.map((list) => (
            <Card 
              key={list.id} 
              className="restaurant-card cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/list/${list.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-sm flex-1">{list.name}</h4>
                  <div className="flex items-center ml-2">
                    {list.is_public ? (
                      <Globe className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {Array.isArray(list.list_restaurants) ? list.list_restaurants.length : 0} restaurants • Created {new Date(list.created_at).toLocaleDateString()}
                </p>
                {list.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{list.description}</p>
                )}
              </CardContent>
            </Card>
          )) : (
            <Card className="restaurant-card">
              <CardContent className="p-6 text-center">
                <h4 className="font-medium text-sm mb-2">No lists yet</h4>
                <p className="text-xs text-muted-foreground">
                  Start creating lists to see them here!
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

export default AllLists;