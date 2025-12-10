import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Info, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileNavigation from "@/components/MobileNavigation";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Featured = () => {
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationChecked, setLocationChecked] = useState(false);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationChecked(true);
        },
        (error) => {
          console.log('Location access denied for featured restaurants:', error);
          setLocationChecked(true);
        }
      );
    } else {
      setLocationChecked(true);
    }
  }, []);

  // Helper function to calculate distance
  const calculateDistance = (point1: {lat: number, lng: number}, point2: {lat: number, lng: number}) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  /* Fetch featured restaurants from Supabase */
  useEffect(() => {
    const fetchFeaturedRestaurants = async () => {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('is_featured', true)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        if (error) {
          console.error('Error fetching featured restaurants:', error);
          setRestaurants([]);
        } else {
          /* Get reviews for each restaurant to calculate average rating - only count ratings >= 0.5 */
          let restaurantsWithRatings = await Promise.all(
            (data || []).map(async (restaurant) => {
              const { data: reviewsData } = await supabase
                .from('reviews')
                .select('rating')
                .eq('restaurant_id', restaurant.id)
                .gte('rating', 0.5);

              let averageRating = null;
              if (reviewsData && reviewsData.length > 0) {
                const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
                averageRating = (totalRating / reviewsData.length).toFixed(1);
              }

              return {
                ...restaurant,
                rating: averageRating
              };
            })
          );

          // Filter by distance (30km) and sort by distance if user location is available
          if (userLocation) {
            restaurantsWithRatings = restaurantsWithRatings
              .map(restaurant => ({
                ...restaurant,
                distance: calculateDistance(userLocation, { 
                  lat: Number(restaurant.latitude), 
                  lng: Number(restaurant.longitude) 
                })
              }))
              .filter(restaurant => restaurant.distance <= 30)
              .sort((a, b) => a.distance - b.distance);
          }
          
          setRestaurants(restaurantsWithRatings);
        }
      } catch (error) {
        console.error('Error fetching featured restaurants:', error);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    if (locationChecked) {
      fetchFeaturedRestaurants();
    }
  }, [userLocation, locationChecked]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Fixed Logo Banner */}
      <div className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border p-3 z-20">
        <h1 
          className="tastr-logo text-2xl text-center cursor-pointer"
          onClick={() => navigate("/start")}
        >
          tastr.
        </h1>
      </div>

      {/* Content with top padding for fixed banner */}
      <div className="pt-16">
        {/* Page Header */}
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
            <h1 className="text-2xl font-medium">Featured Restaurants</h1>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="rounded-full absolute right-4 h-8 w-8"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>About Featured Restaurants</AlertDialogTitle>
                  <AlertDialogDescription>
                    All restaurants displayed here are paid placements or included through partnership agreements.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction>Got it</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="p-4">
          {!locationChecked || loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <h1 className="tastr-logo text-3xl mb-4">tastr.</h1>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !userLocation ? (
            <Card className="restaurant-card">
              <CardContent className="p-8 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium text-lg mb-2">Location unavailable</h3>
                <p className="text-muted-foreground">Turn on location to see featured restaurants</p>
              </CardContent>
            </Card>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No featured restaurants within 30km</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {restaurants.map((restaurant) => (
            <Card 
              key={restaurant.id} 
              className="restaurant-card cursor-pointer"
              onClick={() => navigate(`/restaurant/${restaurant.id}`)}
            >
              <CardContent className="p-3">
                <h4 className="font-medium text-sm text-center mb-2">{restaurant.name}</h4>
                <div className="flex flex-col items-center gap-1">
                  {restaurant.rating && (
                    <div className="flex items-center">
                      <Star className="h-3 w-3 text-primary mr-1 fill-current" />
                      <span className="text-xs text-muted-foreground">
                        {restaurant.rating}
                      </span>
                    </div>
                  )}
                  {restaurant.distance && (
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 text-muted-foreground mr-1" />
                      <span className="text-xs text-muted-foreground">
                        {restaurant.distance.toFixed(1)} km
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default Featured;