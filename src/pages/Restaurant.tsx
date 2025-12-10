import { useRef, useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Star, MapPin, Plus, List, Bookmark, Loader2, Heart, Phone, Globe, Image, Utensils, Clock, ChevronDown } from "lucide-react";
import MobileNavigation from "@/components/MobileNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWantToTry } from "@/hooks/useWantToTry";
import { RestaurantService, type Restaurant } from "@/services/RestaurantService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { PhotoGallery } from "@/components/PhotoGallery";
import { normalizeCuisines } from "@/lib/cuisine-utils";

const Restaurant = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { addToWantToTry, removeFromWantToTry, checkIfInWantToTry } = useWantToTry();
  
  // Get MapKit Place ID from URL params (for new integration) 
  const mapkitPlaceId = searchParams.get('mapkitPlaceId');
  
  // State for restaurant data
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [friendsReviews, setFriendsReviews] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any>(null);
  const [friendsRatings, setFriendsRatings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInWantToTry, setIsInWantToTry] = useState(false);
  const [isInFavorites, setIsInFavorites] = useState(false);
  const [showListDialog, setShowListDialog] = useState(false);
  const [userLists, setUserLists] = useState<any[]>([]);
  const [listsWithRestaurant, setListsWithRestaurant] = useState<string[]>([]);
  const [addingToListId, setAddingToListId] = useState<string | null>(null);
  const [showPhotosDialog, setShowPhotosDialog] = useState(false);
  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [showHoursDialog, setShowHoursDialog] = useState(false);
  const [showHoursDropdown, setShowHoursDropdown] = useState(false);
  const [showDetailsDropdown, setShowDetailsDropdown] = useState(false);
  const [showRatingsDropdown, setShowRatingsDropdown] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWantToTry, setIsWantToTry] = useState(false);
  const [isInList, setIsInList] = useState(false);
  
  // Refs for scrolling
  const overallRatingsRef = useRef<HTMLDivElement>(null);
  const friendsRatingsRef = useRef<HTMLDivElement>(null);

  // Fetch restaurant details using the new RestaurantService
  const fetchRestaurantDetails = async () => {
    if (!id && !mapkitPlaceId) return;
    
    try {
      setLoading(true);
      
      let restaurantData: Restaurant | null = null;
      
      if (mapkitPlaceId) {
        // Fetch using MapKit Place ID (new integration)
        console.log('Fetching restaurant by MapKit Place ID:', mapkitPlaceId);
        restaurantData = await RestaurantService.fetchRestaurantByPlaceId(mapkitPlaceId);
      } else if (id && !id.startsWith('mapkit-')) {
        // Fetch using internal ID (existing functionality)
        console.log('Fetching restaurant by internal ID:', id);
        restaurantData = await RestaurantService.getRestaurantById(Number(id));
      }
      
      if (!restaurantData) {
        throw new Error('Restaurant not found');
      }
      
      const normalizedRestaurant = {
        ...restaurantData,
        cuisines: normalizeCuisines((restaurantData as any).cuisines),
      };

      setRestaurant(normalizedRestaurant);
      
      // Update URL with internal ID if we fetched by MapKit Place ID
      if (mapkitPlaceId && restaurantData.id !== Number(id)) { // Parse string ID to number for comparison
        navigate(`/restaurant/${restaurantData.id}?mapkitPlaceId=${mapkitPlaceId}`, { replace: true });
      }
      
      // Use the restaurant ID for further queries
      const restaurantId = restaurantData.id;
      
      // Check if restaurant is in want-to-try list
      const inWantToTry = await checkIfInWantToTry(restaurantId);
      setIsInWantToTry(inWantToTry);

      // Check if restaurant is in favorites
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('favorites')
          .eq('user_id', user.id)
          .single();
        
        const favoritesList = Array.isArray(profile?.favorites) ? profile.favorites : [];
        const isInFavs = favoritesList.some((fav: any) => fav.id === restaurantId);
        setIsInFavorites(isInFavs);
      }
      
      // Fetch user reviews for this restaurant
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_hidden', false);

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
      } else {
        // Fetch profile information for review authors
        let reviewsWithProfiles = reviewsData || [];
        if (reviewsData && reviewsData.length > 0) {
          const userIds = [...new Set(reviewsData.map(review => review.user_id))];
          const { data: profilesData } = await supabase
            .from('public_profiles')
            .select('user_id, username, full_name, avatar_url')
            .in('user_id', userIds);
          
          // Merge profile data with reviews
          reviewsWithProfiles = reviewsData.map(review => ({
            ...review,
            profile: profilesData?.find(profile => profile.user_id === review.user_id) || null
          }));
        }
        
        setReviews(reviewsWithProfiles);
        
        /* Calculate average ratings - only count ratings >= 0.5 */
        if (reviewsData && reviewsData.length > 0) {
          const validRatings = reviewsData.filter(r => r.rating && r.rating >= 0.5);
          const avgRating = validRatings.length > 0 
            ? validRatings.reduce((sum, review) => sum + review.rating, 0) / validRatings.length 
            : null;
          
          const validFood = reviewsData.filter(r => r.food_rating && r.food_rating >= 0.5);
          const avgFood = validFood.length > 0 
            ? validFood.reduce((sum, review) => sum + review.food_rating, 0) / validFood.length
            : null;
          
          const validDrinks = reviewsData.filter(r => r.drinks_rating && r.drinks_rating >= 0.5);
          const avgDrinks = validDrinks.length > 0 
            ? validDrinks.reduce((sum, review) => sum + review.drinks_rating, 0) / validDrinks.length
            : null;
          
          const validService = reviewsData.filter(r => r.service_rating && r.service_rating >= 0.5);
          const avgService = validService.length > 0 
            ? validService.reduce((sum, review) => sum + review.service_rating, 0) / validService.length
            : null;
          
          const validAtmosphere = reviewsData.filter(r => r.atmosphere_rating && r.atmosphere_rating >= 0.5);
          const avgAtmosphere = validAtmosphere.length > 0 
            ? validAtmosphere.reduce((sum, review) => sum + review.atmosphere_rating, 0) / validAtmosphere.length
            : null;
          
          const validPriceLevel = reviewsData.filter(r => r.price_level);
          const avgPriceLevel = validPriceLevel.length > 0 
            ? Math.round(validPriceLevel.reduce((sum, review) => sum + review.price_level, 0) / validPriceLevel.length)
            : null;
          
          const validValueForMoney = reviewsData.filter(r => r.value_for_money_rating && r.value_for_money_rating >= 0.5);
          const avgValueForMoney = validValueForMoney.length > 0 
            ? validValueForMoney.reduce((sum, review) => sum + review.value_for_money_rating, 0) / validValueForMoney.length
            : null;

          setRatings({
            overall: avgRating,
            food: avgFood,
            drinks: avgDrinks,
            service: avgService,
            atmosphere: avgAtmosphere,
            priceLevel: avgPriceLevel,
            valueForMoney: avgValueForMoney,
            totalReviews: validRatings.length
          });
        }
      }
      
      /* Fetch friends reviews for this restaurant - friends are people you follow */
      const { data: currentUser } = await supabase.auth.getUser();
      if (currentUser.user) {
        // Get people the current user follows
        const { data: followingData } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', currentUser.user.id);
        
        if (followingData && followingData.length > 0) {
          const followingIds = followingData.map(f => f.following_id);
          
          // Fetch friends' reviews for this restaurant
          const { data: friendsReviewsData } = await supabase
            .from('reviews')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_hidden', false)
            .in('user_id', followingIds);
          
          if (friendsReviewsData && friendsReviewsData.length > 0) {
            // Get profile data for friends
            const { data: friendProfilesData } = await supabase
              .from('public_profiles')
              .select('user_id, username, full_name, avatar_url')
              .in('user_id', followingIds);
            
            // Merge profile data with friends reviews
            const friendsReviewsWithProfiles = friendsReviewsData.map(review => ({
              ...review,
              profile: friendProfilesData?.find(profile => profile.user_id === review.user_id) || null
            }));
            
            setFriendsReviews(friendsReviewsWithProfiles);
            
            /* Calculate friends average ratings - only count ratings >= 0.5 */
              const validFriendRatings = friendsReviewsData.filter(r => r.rating && r.rating >= 0.5);
              const friendAvgRating = validFriendRatings.length > 0 
                ? validFriendRatings.reduce((sum, review) => sum + review.rating, 0) / validFriendRatings.length 
                : null;
              const validFriendFood = friendsReviewsData.filter(r => r.food_rating && r.food_rating >= 0.5);
              const friendAvgFood = validFriendFood.length > 0 
                ? validFriendFood.reduce((sum, review) => sum + review.food_rating, 0) / validFriendFood.length
                : null;
              const validFriendDrinks = friendsReviewsData.filter(r => r.drinks_rating && r.drinks_rating >= 0.5);
              const friendAvgDrinks = validFriendDrinks.length > 0 
                ? validFriendDrinks.reduce((sum, review) => sum + review.drinks_rating, 0) / validFriendDrinks.length
                : null;
              const validFriendService = friendsReviewsData.filter(r => r.service_rating && r.service_rating >= 0.5);
              const friendAvgService = validFriendService.length > 0 
                ? validFriendService.reduce((sum, review) => sum + review.service_rating, 0) / validFriendService.length
                : null;
              const validFriendAtmosphere = friendsReviewsData.filter(r => r.atmosphere_rating && r.atmosphere_rating >= 0.5);
              const friendAvgAtmosphere = validFriendAtmosphere.length > 0 
                ? validFriendAtmosphere.reduce((sum, review) => sum + review.atmosphere_rating, 0) / validFriendAtmosphere.length
                : null;
              const validFriendValueForMoney = friendsReviewsData.filter(r => r.value_for_money_rating && r.value_for_money_rating >= 0.5);
              const friendAvgValueForMoney = validFriendValueForMoney.length > 0 
                ? validFriendValueForMoney.reduce((sum, review) => sum + review.value_for_money_rating, 0) / validFriendValueForMoney.length
                : null;
              
            setFriendsRatings({
              overall: friendAvgRating,
              food: friendAvgFood,
              drinks: friendAvgDrinks,
              service: friendAvgService,
              atmosphere: friendAvgAtmosphere,
              valueForMoney: friendAvgValueForMoney,
              totalReviews: friendsReviewsData.length
            });
          }
        }
      }
      
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch restaurant details');
      toast({
        title: "Error",
        description: "Failed to load restaurant details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch restaurant details
  useEffect(() => {
    fetchRestaurantDetails();
  }, [id, mapkitPlaceId]);

  // Separate useEffect to check favorite status whenever restaurant changes
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!restaurant?.id) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsInFavorites(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('favorites')
          .eq('user_id', user.id)
          .single();

        const favoritesList = Array.isArray(profile?.favorites) ? profile.favorites : [];
        const isInFavs = favoritesList.some((fav: any) => fav.id === restaurant.id);
        console.log('Checking favorite status for restaurant:', restaurant.id, 'Result:', isInFavs);
        setIsInFavorites(isInFavs);
      } catch (error) {
        console.error('Error checking favorite status:', error);
        setIsInFavorites(false);
      }
    };

    checkFavoriteStatus();
  }, [restaurant?.id]);

  // Helper function to get price level text
  const getPriceLevel = (level: number | null) => {
    if (!level) return "Unavailable";
    const roundedLevel = Math.round(level);
    const levels = {
      1: "Cheap",
      2: "Affordable", 
      3: "Moderate",
      4: "Expensive",
      5: "Luxury"
    };
    return levels[roundedLevel as keyof typeof levels] || "Unknown";
  };

  // Helper function to get cuisine type from restaurant types
  const getCuisineType = (types: string[]) => {
    const cuisineTypes = types.filter(type => 
      !['restaurant', 'food', 'establishment', 'point_of_interest', 'lodging'].includes(type)
    );
    return cuisineTypes.length > 0 ? 
      cuisineTypes[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
      "Restaurant";
  };

  const scrollToOverallRatings = () => {
    overallRatingsRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'center'
    });
  };

  const scrollToFriendsRatings = () => {
    friendsRatingsRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'center'
    });
  };

  const handleWantToTryToggle = async () => {
    if (!restaurant) return;
    
    if (isInWantToTry) {
      const success = await removeFromWantToTry(restaurant.id);
      if (success) {
        setIsInWantToTry(false);
      }
    } else {
      const success = await addToWantToTry({
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address
      });
      if (success) {
        setIsInWantToTry(true);
      }
    }
  };

  // Fetch user lists when dialog opens
  useEffect(() => {
    if (showListDialog) {
      fetchUserLists();
    }
  }, [showListDialog]);

  const fetchUserLists = async () => {
    if (!restaurant) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserLists(data || []);
      
      // Check which lists already contain this restaurant
      if (data && data.length > 0) {
        const listIds = data.map(list => list.id);
        const { data: listRestaurants } = await supabase
          .from('list_restaurants')
          .select('list_id')
          .eq('restaurant_id', restaurant.id)
          .in('list_id', listIds);
        
        setListsWithRestaurant(listRestaurants?.map(lr => lr.list_id) || []);
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    }
  };

  const handleAddToList = async (listId: string) => {
    if (!restaurant) return;
    
    // Don't allow adding if already in list
    if (listsWithRestaurant.includes(listId)) return;
    
    setAddingToListId(listId);
    try {
      // Get current position
      const { data: existingRestaurants } = await supabase
        .from('list_restaurants')
        .select('position')
        .eq('list_id', listId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = existingRestaurants && existingRestaurants.length > 0 
        ? existingRestaurants[0].position + 1 
        : 0;

      // Add to list
      const { error } = await supabase
        .from('list_restaurants')
        .insert({
          list_id: listId,
          restaurant_id: restaurant.id,
          position: nextPosition
        });

      if (error) throw error;
      
      setShowListDialog(false);
    } catch (error) {
      console.error('Error adding to list:', error);
    } finally {
      setAddingToListId(null);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!restaurant) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('favorites')
        .eq('user_id', user.id)
        .single();
      
      const currentFavorites = Array.isArray(profile?.favorites) ? profile.favorites : [];
      let updatedFavorites;
      
      if (isInFavorites) {
        // Remove from favorites
        updatedFavorites = currentFavorites.filter((fav: any) => fav.id !== restaurant.id);
        setIsInFavorites(false);
      } else {
        // Add to favorites
        const newFavorite = {
          id: restaurant.id,
          name: restaurant.name,
          address: restaurant.address,
          added_at: new Date().toISOString()
        };
        updatedFavorites = [...currentFavorites, newFavorite];
        setIsInFavorites(true);
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({ favorites: updatedFavorites })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error updating favorites:', error);
        // Revert state on error
        setIsInFavorites(!isInFavorites);
        toast({
          title: "Error",
          description: "Failed to update favorites",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border p-3 z-20">
          <h1 
            className="tastr-logo text-2xl text-center cursor-pointer"
            onClick={() => navigate("/start")}
          >
            tastr.
          </h1>
        </div>
        <div className="pt-16 flex items-center justify-center h-screen">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading restaurant details...</span>
          </div>
        </div>
        <MobileNavigation />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border p-3 z-20">
          <h1 
            className="tastr-logo text-2xl text-center cursor-pointer"
            onClick={() => navigate("/start")}
          >
            tastr.
          </h1>
        </div>
        <div className="pt-16">
          <div className="bg-background border-b border-border p-4">
            <div className="flex items-center">
              <Button 
                onClick={() => navigate(-1)}
                variant="ghost" 
                size="icon"
                className="rounded-full mr-3"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-medium">Restaurant Not Found</h2>
            </div>
          </div>
          <div className="p-4 text-center">
            <p className="text-muted-foreground">{error || "Restaurant details could not be loaded."}</p>
          </div>
        </div>
        <MobileNavigation />
      </div>
    );
  }

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
              className="absolute left-4 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-medium">{restaurant.name}</h2>
          </div>
        </div>

        {/* Restaurant Info */}
        <div className="p-4 space-y-6">
        {/* Main Card - Only show if there's content */}
        {(() => {
          // Check if there's any content to display
          const hasRating = ratings?.overall != null;
          const hasCuisines = restaurant.cuisines && Array.isArray(restaurant.cuisines) && restaurant.cuisines.length > 0;
          const hasAddress = !!restaurant.address;
          const hasWebsite = !!restaurant.website;
          const hasPhone = !!restaurant.phone;
          const hasHours = (() => {
            const operatingHours = (restaurant as any).operating_hours || {};
            const standardHours = operatingHours.standardHours || {};
            return standardHours && Object.keys(standardHours).length > 0;
          })();
          const hasBio = !!(restaurant as any).description || !!(restaurant as any).bio;
          
          const hasCollapsibleContent = hasAddress || hasWebsite || hasPhone || hasHours || hasBio;
          const hasAnyContent = hasRating || hasCuisines || hasCollapsibleContent;
          
          if (!hasAnyContent) return null;
          
          return (
            <Card className="restaurant-card">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Overall Rating - Only show if available */}
                  {hasRating && (
                    <div className="flex items-center gap-1.5">
                      <Star className="h-5 w-5 text-primary fill-current" />
                      <span className="text-lg font-medium">{ratings.overall.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">({ratings.totalReviews})</span>
                    </div>
                  )}
                  
                  {/* Cuisines - No header, just tags */}
                  {hasCuisines && (
                    <div className="flex flex-wrap gap-1.5">
                      {restaurant.cuisines.map((cuisine: string, index: number) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground"
                        >
                          {cuisine}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Collapsible Details Section - Only show if there's content */}
                  {hasCollapsibleContent && (
                    <Collapsible open={showDetailsDropdown} onOpenChange={setShowDetailsDropdown}>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${showDetailsDropdown ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3 space-y-3">
                        {/* Address */}
                        {hasAddress && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{restaurant.address}</span>
                          </div>
                        )}
                        
                        {/* Bio/Description */}
                        {hasBio && (
                          <div className="text-sm text-muted-foreground">
                            {(restaurant as any).description || (restaurant as any).bio}
                          </div>
                        )}
                        
                        {/* Website */}
                        {hasWebsite && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <a 
                              href={restaurant.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-muted-foreground hover:text-primary transition-colors truncate"
                            >
                              {restaurant.website.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        )}
                        
                        {/* Phone Number */}
                        {hasPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <a 
                              href={`tel:${restaurant.phone}`}
                              className="text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                              {restaurant.phone}
                            </a>
                          </div>
                        )}
                        
                        {/* Opening Hours */}
                        {hasHours && (() => {
                          const operatingHours = (restaurant as any).operating_hours || {};
                          const standardHours = operatingHours.standardHours || {};
                          
                          const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                          const today = new Date().getDay();
                          const dayName = daysOfWeek[today];
                          const todayData = standardHours[dayName];
                          
                          const isOpen = (() => {
                            if (!todayData || todayData.isClosed || !todayData.timePeriods || todayData.timePeriods.length === 0) {
                              return false;
                            }
                            
                            const now = new Date();
                            const currentTime = now.getHours() * 60 + now.getMinutes();
                            
                            return todayData.timePeriods.some((period: any) => {
                              const [openHour, openMin] = period.openTime.split(':').map(Number);
                              const [closeHour, closeMin] = period.closeTime.split(':').map(Number);
                              const openTime = openHour * 60 + openMin;
                              const closeTime = closeHour * 60 + closeMin;
                              
                              return currentTime >= openTime && currentTime < closeTime;
                            });
                          })();
                          
                          return (
                            <div className="space-y-2">
                              <div 
                                className="flex items-center justify-between cursor-pointer hover:text-primary transition-colors"
                                onClick={() => setShowHoursDropdown(!showHoursDropdown)}
                              >
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm text-muted-foreground">
                                    {isOpen ? 'Open' : 'Closed'}
                                  </span>
                                </div>
                                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showHoursDropdown ? 'rotate-180' : ''}`} />
                              </div>
                              
                              {showHoursDropdown && (
                                <div className="pl-6 space-y-1">
                                  {daysOfWeek.map((day) => {
                                    const dayData = standardHours[day];
                                    const isToday = day === dayName;
                                    
                                    return (
                                      <div key={day} className={`flex justify-between text-sm ${isToday ? 'font-medium' : ''}`}>
                                        <span className="text-muted-foreground">{day}</span>
                                        <span className="text-muted-foreground">
                                          {!dayData || dayData.isClosed || !dayData.timePeriods || dayData.timePeriods.length === 0
                                            ? 'Closed'
                                            : dayData.timePeriods.map((period: any, idx: number) => (
                                                <span key={idx}>
                                                  {period.openTime} - {period.closeTime}
                                                  {idx < dayData.timePeriods.length - 1 ? ', ' : ''}
                                                </span>
                                              ))
                                          }
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={() => navigate(`/log?restaurant=${id}&name=${encodeURIComponent(restaurant.name)}&address=${encodeURIComponent(restaurant.address || '')}`)}
            className="btn-primary w-full flex items-center justify-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Log a Visit
          </Button>

          <div className="grid grid-cols-3 gap-3">
            <Button 
              onClick={handleFavoriteToggle}
              variant="outline" 
              className="btn-secondary flex items-center justify-center"
            >
              <Heart className={`h-4 w-4 ${isInFavorites ? 'fill-current text-red-500' : ''}`} />
            </Button>
            
            <Button 
              onClick={handleWantToTryToggle}
              variant="outline" 
              className="btn-secondary flex items-center justify-center"
            >
              <Bookmark className={`h-4 w-4 ${isInWantToTry ? 'fill-current' : ''}`} />
            </Button>

            <Button 
              onClick={() => setShowListDialog(true)}
              variant="outline" 
              className="btn-secondary flex items-center justify-center"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Pictures and Menu buttons - only show if data exists */}
          {((restaurant as any).photos?.length > 0 || (restaurant as any).menu_files?.length > 0) && (
            <div className={`grid gap-3 ${
              [(restaurant as any).photos?.length > 0, (restaurant as any).menu_files?.length > 0].filter(Boolean).length === 2
                ? 'grid-cols-2'
                : 'grid-cols-1'
            }`}>
              {(restaurant as any).photos && (restaurant as any).photos.length > 0 && (
                <Button 
                  onClick={() => setShowPhotosDialog(true)}
                  variant="outline" 
                  className="btn-secondary flex items-center justify-center p-3"
                >
                  <Image className="h-5 w-5" />
                </Button>
              )}
              
              {(restaurant as any).menu_files && (restaurant as any).menu_files.length > 0 && (
                <Button 
                  onClick={() => setShowMenuDialog(true)}
                  variant="outline" 
                  className="btn-secondary flex items-center justify-center p-3"
                >
                  <Utensils className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}
        </div>


        {/* Combined Ratings Section */}
        <Card className="restaurant-card" ref={overallRatingsRef}>
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium">Ratings</h2>
              {(reviews.length > 0 || friendsReviews.length > 0) && (
                <Collapsible open={showRatingsDropdown} onOpenChange={setShowRatingsDropdown}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6 p-0"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${showRatingsDropdown ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              )}
            </div>
            
            {/* Ratings Table - Always shown */}
            <div className="grid grid-cols-2 gap-6">
              {/* All Ratings Column */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">All</span>
                  {ratings?.overall ? (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-primary fill-current" />
                      <span className="text-sm font-medium">{ratings.overall.toFixed(1)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No ratings</span>
                  )}
                </div>
              </div>
              
              {/* Friends Ratings Column */}
              <div ref={friendsRatingsRef}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Friends</span>
                  {friendsRatings?.overall ? (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-primary fill-current" />
                      <span className="text-sm font-medium">{friendsRatings.overall.toFixed(1)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No ratings</span>
                  )}
                </div>
              </div>
            </div>
              
            {/* Collapsible Details */}
            {(reviews.length > 0 || friendsReviews.length > 0) && (
              <Collapsible open={showRatingsDropdown} onOpenChange={setShowRatingsDropdown}>
                <CollapsibleContent className="mt-4 space-y-4">
                  {/* Sub Ratings */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* All Detailed Ratings */}
                    {reviews.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Value for Money</span>
                          {ratings?.valueForMoney ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-primary fill-current" />
                              <span className="text-xs">{ratings.valueForMoney.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Food</span>
                          {ratings?.food ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-primary fill-current" />
                              <span className="text-xs">{ratings.food.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Drinks</span>
                          {ratings?.drinks ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-primary fill-current" />
                              <span className="text-xs">{ratings.drinks.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Service</span>
                          {ratings?.service ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-primary fill-current" />
                              <span className="text-xs">{ratings.service.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Atmosphere</span>
                          {ratings?.atmosphere ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-primary fill-current" />
                              <span className="text-xs">{ratings.atmosphere.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Friends Detailed Ratings */}
                    {friendsReviews.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Value for Money</span>
                          {friendsRatings?.valueForMoney ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-primary fill-current" />
                              <span className="text-xs">{friendsRatings.valueForMoney.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Food</span>
                          {friendsRatings?.food ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-primary fill-current" />
                              <span className="text-xs">{friendsRatings.food.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Drinks</span>
                          {friendsRatings?.drinks ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-primary fill-current" />
                              <span className="text-xs">{friendsRatings.drinks.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Service</span>
                          {friendsRatings?.service ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-primary fill-current" />
                              <span className="text-xs">{friendsRatings.service.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Atmosphere</span>
                          {friendsRatings?.atmosphere ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-primary fill-current" />
                              <span className="text-xs">{friendsRatings.atmosphere.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Stats Section */}
                  <div className="pt-4 border-t border-border">
                    <div className="grid grid-cols-2 gap-6">
                      {/* All Stats */}
                      {reviews.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Visitors</span>
                            <span className="text-sm font-medium">
                              {reviews.length > 0 ? new Set(reviews.map(r => r.user_id)).size : 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Visits</span>
                            <span className="text-sm font-medium">{reviews.length}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Friends Stats */}
                      {friendsReviews.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Visitors</span>
                            <span className="text-sm font-medium">
                              {friendsReviews.length > 0 ? new Set(friendsReviews.map(r => r.user_id)).size : 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Visits</span>
                            <span className="text-sm font-medium">{friendsReviews.length}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Price Level */}
                    {ratings?.priceLevel && (
                      <div className="mt-4 pt-4 border-t border-border text-center">
                        <div className="text-xs text-muted-foreground mb-1">Price Level</div>
                        <div className="text-sm font-medium">{getPriceLevel(ratings.priceLevel)}</div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>

        {/* All Reviews */}
        {reviews.length > 0 && (
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => navigate(`/restaurant/${id}/ratings/all`)}
            className="w-full"
          >
            View All Reviews
          </Button>
        )}

        </div>
      </div>

      <MobileNavigation />

      {/* Add to List Dialog */}
      <Dialog open={showListDialog} onOpenChange={setShowListDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-2">
            <DialogTitle>Add to List</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              {userLists.length > 0 ? (
                userLists.map((list) => {
                  const isInList = listsWithRestaurant.includes(list.id);
                  return (
                    <Card 
                      key={list.id} 
                      className={`cursor-pointer transition-colors ${
                        isInList 
                          ? 'bg-muted/80 opacity-60 cursor-not-allowed' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => !isInList && handleAddToList(list.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{list.name}</h4>
                            {list.description && (
                              <p className="text-sm text-muted-foreground">{list.description}</p>
                            )}
                            {isInList && (
                              <p className="text-xs text-muted-foreground mt-1">Already added</p>
                            )}
                          </div>
                          {addingToListId === list.id && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No lists yet. Create one to get started!
                </p>
              )}
            </div>
            
            <Button 
              onClick={() => {
                setShowListDialog(false);
                navigate(`/create-list?restaurantId=${restaurant?.id}&restaurantName=${encodeURIComponent(restaurant?.name || '')}`);
              }}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New List
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photos Gallery */}
      <PhotoGallery
        photos={(restaurant as any).photos || []}
        initialIndex={0}
        open={showPhotosDialog}
        onOpenChange={setShowPhotosDialog}
      />

      {/* Menu Gallery */}
      <PhotoGallery
        photos={(restaurant as any).menu_files || []}
        initialIndex={0}
        open={showMenuDialog}
        onOpenChange={setShowMenuDialog}
      />

      {/* Opening Hours Dialog */}
      <Dialog open={showHoursDialog} onOpenChange={setShowHoursDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Opening Hours</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Comment: Operating hours data displayed here for next 7 days */}
            {(() => {
              const operatingHours = (restaurant as any).operating_hours || {};
              const standardHours = operatingHours.standardHours || {};
              const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const today = new Date().getDay();
              const next7Days = [];
              
              for (let i = 0; i < 7; i++) {
                const dayIndex = (today + i) % 7;
                const dayName = daysOfWeek[dayIndex];
                const dayData = standardHours[dayName];
                
                if (dayData && !dayData.isClosed && dayData.timePeriods && dayData.timePeriods.length > 0) {
                  // Add a row for each time period
                  dayData.timePeriods.forEach((period: any, periodIndex: number) => {
                    next7Days.push(
                      <div key={`${dayName}-${i}-${periodIndex}`} className="flex justify-between items-center py-2">
                        <span className="text-sm">
                          {periodIndex === 0 ? dayName : ''}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {period.openTime} - {period.closeTime}
                        </span>
                      </div>
                    );
                  });
                } else {
                  // Closed day - single row
                  next7Days.push(
                    <div key={`${dayName}-${i}`} className="flex justify-between items-center py-2">
                      <span className="text-sm">
                        {dayName}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Closed
                      </span>
                    </div>
                  );
                }
              }
              
              return next7Days;
            })()}
          </div>
        </DialogContent>
      </Dialog>

      <MobileNavigation />
    </div>
  );
};

export default Restaurant;