import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Heart } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MobileNavigation from "@/components/MobileNavigation";
import HeaderBanner from "@/components/HeaderBanner";

const Favorites = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { id } = useParams();
  
  // Determine if viewing own favorites or someone else's
  const isOwnProfile = !id || id === authUser?.id;
  const profileUserId = id || authUser?.id;
  
  const [favoriteRestaurants, setFavoriteRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!profileUserId) return;
      
      try {
        // Get user's favorited restaurants from profiles.favorites
        const { data: profileData } = await supabase
          .from('profiles')
          .select('favorites')
          .eq('user_id', profileUserId)
          .maybeSingle();

        if (profileData?.favorites && Array.isArray(profileData.favorites)) {
          setFavoriteRestaurants(profileData.favorites);
        }
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [profileUserId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex flex-col items-center justify-center">
        <h1 className="tastr-logo text-3xl mb-4">tastr.</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
              onClick={() => navigate(isOwnProfile ? "/profile" : `/profile/${profileUserId}`)}
              variant="ghost" 
              size="icon"
              className="rounded-full absolute left-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-medium">Favorites</h1>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="restaurant-card">
                  <CardContent className="p-3">
                    <div className="animate-pulse">
                      <div className="h-4 bg-muted rounded mb-2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : favoriteRestaurants.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {favoriteRestaurants.map((restaurant) => (
                <Card 
                  key={restaurant.id} 
                  className="restaurant-card cursor-pointer"
                  onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                >
                  <CardContent className="p-3">
                    <h4 className="font-medium text-sm text-center truncate">{restaurant.name}</h4>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="restaurant-card">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No favorites yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default Favorites;