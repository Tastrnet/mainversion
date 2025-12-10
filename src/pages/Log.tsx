import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, Star, ChevronDown, RotateCcw, Search, X } from "lucide-react";
import WheelPicker from "@/components/WheelPicker";
import { format } from "date-fns";
import MobileNavigation from "@/components/MobileNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useWantToTry } from "@/hooks/useWantToTry";
import { RestaurantService } from "@/services/RestaurantService";
import { calculateDistance, sortRestaurantsByRelevance } from "@/lib/search-utils";
import { normalizeCuisines } from "@/lib/cuisine-utils";
import { fetchNearbyRestaurants, normalizeRestaurantCoordinates } from "@/services/fetchNearbyRestaurants";

const Log = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { removeFromWantToTry, checkIfInWantToTry } = useWantToTry();
  const restaurantId = searchParams.get('restaurant');
  const restaurantName = searchParams.get('name');
  const restaurantAddress = searchParams.get('address');
  
  const [date, setDate] = useState<Date>(new Date());
  const [selectedRestaurant, setSelectedRestaurant] = useState(restaurantName || "");
  const [selectedRestaurantData, setSelectedRestaurantData] = useState<any>(
    restaurantId ? {
      place_id: restaurantId,
      name: restaurantName,
      address: restaurantAddress
    } : null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [nearbyRestaurants, setNearbyRestaurants] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [review, setReview] = useState("");
  const [showDetailedRatings, setShowDetailedRatings] = useState(false);
  const [showRestaurantSelection, setShowRestaurantSelection] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [ratings, setRatings] = useState({
    overall: 0,
    priceLevel: 0,
    valueForMoney: 0,
    food: 0,
    drinks: 0,
    service: 0,
    atmosphere: 0
  });

  /* Fetch closest restaurants from database */
  const searchRestaurants = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      
      try {
        /* Search restaurants in database by name, address, or city (same as Search page) */
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .or(`name.ilike.%${query}%,address.ilike.%${query}%,city.ilike.%${query}%`);

        if (error) {
          console.error('Search error:', error);
          toast.error("Failed to search restaurants. Please try again.");
          setSearchResults([]);
          setIsSearching(false);
          return;
        }

        const results = data || [];

        /* Enhance search results with ratings and visit counts from database reviews (same as Search page) */
        const restaurantIds = results.map(r => r.id);
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('restaurant_id, rating')
          .in('restaurant_id', restaurantIds);
        
        // Calculate visit counts (all reviews, not just rated ones)
        const visitCounts = new Map<string, number>();
        if (reviewsData) {
          reviewsData.forEach((review: any) => {
            const key = String(review.restaurant_id);
            visitCounts.set(key, (visitCounts.get(key) || 0) + 1);
          });
        }

        const resultsWithRatings = results.map(restaurant => {
          let avgRating = null;
          const restaurantId = String(restaurant.id);
          
          if (reviewsData) {
            const restaurantReviews = reviewsData.filter((review: any) => 
              String(review.restaurant_id) === restaurantId && 
              review.rating && 
              review.rating >= 0.5
            );
            if (restaurantReviews.length > 0) {
              const sum = restaurantReviews.reduce((acc: number, review: any) => acc + review.rating, 0);
              avgRating = sum / restaurantReviews.length;
            }
          }
          
          let distance = null;
          if (userLocation && restaurant.latitude && restaurant.longitude) {
            const distanceValue = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              Number(restaurant.latitude),
              Number(restaurant.longitude)
            );
            distance = distanceValue.toFixed(1) + ' km';
          }

          return {
            ...restaurant,
            rating: avgRating,
            visitCount: visitCounts.get(restaurantId) || 0,
            cuisines: normalizeCuisines(restaurant.cuisines),
            distance,
            place_id: restaurant.google_place_id || restaurant.id,
            location: {
              lat: restaurant.latitude,
              lng: restaurant.longitude
            },
            source: 'database'
          };
        });

        /* Sort results using shared search utility (same as Search page) */
        const sortedResults = sortRestaurantsByRelevance(resultsWithRatings, query, userLocation);

        setSearchResults(sortedResults);
        console.log(`Found ${sortedResults.length} restaurants from search`);
      } catch (error) {
        console.error('Restaurant search error:', error);
        toast.error("Failed to search restaurants. Please try again.");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [userLocation]
  );

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchRestaurants(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchRestaurants]);

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  };

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);


  /* Fetch closest restaurants from database */
  useEffect(() => {
    const fetchClosestRestaurants = async () => {
      if (!userLocation) {
        // If no location, don't show auto results (or show empty)
        setNearbyRestaurants([]);
        return;
      }

      try {
        const MAX_DISTANCE_KM = 25;
        const MAX_RESULTS = 10;
        const SEARCH_RADIUS_METERS = MAX_DISTANCE_KM * 1000;

        // Use efficient PostGIS-based geospatial query
        const baseResults = await fetchNearbyRestaurants(
          userLocation.lat,
          userLocation.lng,
          SEARCH_RADIUS_METERS,
          MAX_RESULTS
        );

        // Results are already sorted by distance from the service
        // Transform to match the expected format
        const formattedRestaurants = baseResults.map((restaurant) => {
          const distanceValue = restaurant.distance_meters / 1000; // Convert to km
          return {
            ...restaurant,
            distance: distanceValue.toFixed(1) + ' km',
            distanceValue,
            id: restaurant.id,
            place_id: restaurant.id,
            location: {
              lat: restaurant.latitude,
              lng: restaurant.longitude
            }
          };
        });

        setNearbyRestaurants(formattedRestaurants);
        console.log('Loaded nearest restaurants by distance:', formattedRestaurants.length);

      } catch (error) {
        console.error('Error fetching nearby restaurants:', error);
        setNearbyRestaurants([]);
      }
    };

    fetchClosestRestaurants();
  }, [userLocation]);

  // Get displayed restaurants (search results or nearby)
  const displayedRestaurants = searchQuery.trim() ? searchResults : nearbyRestaurants;

  const handleRatingChange = (category: string, value: number) => {
    setRatings(prev => ({ ...prev, [category]: value }));
  };

  const handleRatingReset = (category: string) => {
    setRatings(prev => ({ ...prev, [category]: 0 }));
  };

  const handleRestaurantSelect = (restaurant: { name: string; address?: string; place_id?: string }) => {
    setSelectedRestaurant(restaurant.name);
    setSelectedRestaurantData(restaurant);
    setShowRestaurantSelection(false);
  };

  const handleSubmit = async () => {
    if (!selectedRestaurant || !date) {
      toast.error("Please select a restaurant and date");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to submit a review");
      return;
    }

    setIsSubmitting(true);

    try {
      let restaurantDbId = null;
      
      if (selectedRestaurantData?.place_id && selectedRestaurantData?.source === 'mapkit_places') {
        // Use RestaurantService to handle MapKit restaurant
        console.log('Creating/fetching restaurant from MapKit:', selectedRestaurantData.place_id);
        const restaurant = await RestaurantService.fetchRestaurantByPlaceId(
          selectedRestaurantData.place_id,
          {
            name: selectedRestaurantData.name,
            address: selectedRestaurantData.address,
            location: selectedRestaurantData.location
          }
        );
        restaurantDbId = restaurant.id;
      } else if (selectedRestaurantData?.place_id) {
        // Restaurant from our database - use the ID directly
        restaurantDbId = selectedRestaurantData.place_id;
      } else {
        // Manual restaurant entry - create a new restaurant record
        // Note: id is auto-generated by database, don't specify it
        
        const { data: newRestaurant, error: restaurantCreateError } = await supabase
          .from('restaurants')
          .insert({
            name: selectedRestaurant,
            address: selectedRestaurantData?.address || null,
            latitude: selectedRestaurantData?.location?.lat || null,
            longitude: selectedRestaurantData?.location?.lng || null,
            google_place_id: null,
            is_featured: false,
            user_id: user.id
          })
          .select('id')
          .single();

        if (restaurantCreateError) {
          console.error('Error creating restaurant:', restaurantCreateError);
          toast.error('Error saving restaurant data');
          return;
        }

        restaurantDbId = newRestaurant.id;
      }

      // Create the review record
      const reviewData = {
        user_id: user.id,
        restaurant_id: restaurantDbId,
        rating: ratings.overall > 0 ? ratings.overall : null,
        food_rating: ratings.food > 0 ? ratings.food : null,
        drinks_rating: ratings.drinks > 0 ? ratings.drinks : null,
        service_rating: ratings.service > 0 ? ratings.service : null,
        atmosphere_rating: ratings.atmosphere > 0 ? ratings.atmosphere : null,
        price_level: ratings.priceLevel > 0 ? ratings.priceLevel : null,
        value_for_money_rating: ratings.valueForMoney > 0 ? ratings.valueForMoney : null,
        comment: review.trim() || null,
        created_at: date.toISOString()
      };

      const { data: newReview, error: reviewError } = await supabase
        .from('reviews')
        .insert(reviewData)
        .select('id')
        .single();

      if (reviewError) {
        console.error('Error creating review:', reviewError);
        toast.error('Error saving review');
        return;
      }

      // Create activity for the review
      if (newReview) {
        await supabase
          .from('activities')
          .insert({
            user_id: user.id,
            activity_type: 'review_created',
            related_id: newReview.id
          });
      }

      /* Remove from want-to-try list if restaurant is in it (regardless of how user got to log page) */
      if (restaurantDbId) {
        try {
          const isInWantToTry = await checkIfInWantToTry(Number(restaurantDbId));
          if (isInWantToTry) {
            await removeFromWantToTry(Number(restaurantDbId));
          }
        } catch (error) {
          console.error('Error removing from want-to-try:', error);
          // Don't fail the whole submission for this error
        }
      }

      toast.success('Review submitted successfully!');
      navigate("/start");

    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ 
    value, 
    onChange, 
    category
  }: { 
    value: number; 
    onChange: (val: number) => void; 
    category: string;
  }) => {
    const handleStarClick = (starIndex: number) => {
      const newValue = starIndex + 1;
      if (value === newValue) {
        // Second click on same star - set to half star
        onChange(newValue - 0.5);
      } else {
        // First click - set to full star
        onChange(newValue);
      }
    };

    const handleStarMouseMove = (e: React.MouseEvent, starIndex: number) => {
      if (e.buttons === 1) { // Only if mouse is down (dragging)
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const isHalf = x < rect.width / 2;
        onChange(starIndex + (isHalf ? 0.5 : 1));
      }
    };

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {[0, 1, 2, 3, 4].map((starIndex) => {
            const starValue = starIndex + 1;
            const isHalfFilled = value === starIndex + 0.5;
            const isFullFilled = value >= starValue;
            
            return (
              <button
                key={starIndex}
                type="button"
                onClick={() => handleStarClick(starIndex)}
                onMouseMove={(e) => handleStarMouseMove(e, starIndex)}
                className="relative text-2xl select-none"
              >
                {/* Only show background star if there's a rating or this star should be highlighted */}
                {(value > 0 || isHalfFilled || isFullFilled) && (
                  <Star className="h-6 w-6 text-muted-foreground" />
                )}
                {/* Show empty outline star when no rating */}
                {value === 0 && (
                  <Star className="h-6 w-6 text-muted-foreground stroke-current fill-none" />
                )}
                {isHalfFilled && (
                  <Star 
                    className="h-6 w-6 text-primary absolute top-0 left-0 overflow-hidden"
                    style={{ clipPath: 'inset(0 50% 0 0)' }}
                    fill="currentColor"
                  />
                )}
                {isFullFilled && (
                  <Star 
                    className="h-6 w-6 text-primary fill-current absolute top-0 left-0"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const PriceLevelSelector = ({ value, onChange }: { value: number; onChange: (val: number) => void }) => {
    const priceOptions = [
      { level: 1, label: 'Cheap', symbol: '$' },
      { level: 2, label: 'Affordable', symbol: '$$' },
      { level: 3, label: 'Moderate', symbol: '$$$' },
      { level: 4, label: 'Expensive', symbol: '$$$$' },
      { level: 5, label: 'Luxury', symbol: '$$$$$' }
    ];
    
    return (
      <div className="flex gap-1.5">
        {priceOptions.map((option) => (
          <button
            key={option.level}
            type="button"
            onClick={() => onChange(option.level)}
            className={`flex-1 px-2 py-2 rounded-lg border transition-all ${
              value === option.level
                ? 'bg-accent text-accent-foreground border-accent'
                : 'bg-background border-input hover:bg-muted'
            }`}
          >
            <div className="flex flex-col items-center justify-center">
              <span className="text-xs font-medium">{option.symbol}</span>
              <span className="text-[10px] opacity-70 mt-0.5">{option.label}</span>
            </div>
          </button>
        ))}
      </div>
    );
  };

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
            <h1 className="text-2xl font-medium">Log a Visit</h1>
          </div>
        </div>

      <div className="p-4 space-y-6">
        {/* Restaurant Selection */}
        <Card className="restaurant-card">
          <CardContent className="p-4">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowRestaurantSelection(!showRestaurantSelection)}
            >
              <div className="flex-1">
                <Label className="text-sm font-medium cursor-pointer">Restaurant *</Label>
                <div className="mt-2">
                  <div className="text-sm text-foreground font-medium">
                    {selectedRestaurant || "Choose a restaurant"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {selectedRestaurant && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRestaurant("");
                      setSelectedRestaurantData(null);
                    }}
                    className="h-auto p-1 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRestaurantSelection(!showRestaurantSelection);
                  }}
                  className="h-auto p-1"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${showRestaurantSelection ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </div>
            
            {showRestaurantSelection && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search restaurants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 rounded-xl"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {/* Restaurant Results */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {searchQuery.trim() ? (
                      isSearching ? "Searching..." : `Search Results${searchResults.length > 0 ? ` (${searchResults.length})` : ""}`
                    ) : userLocation ? "Closest Restaurants" : "Restaurants"}
                  </Label>
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                    {displayedRestaurants.length > 0 ? (
                      displayedRestaurants.map((restaurant) => (
                        <Button
                          key={restaurant.id}
                          variant="ghost"
                          onClick={() => handleRestaurantSelect(restaurant)}
                          className="justify-start h-auto p-3 text-left w-full"
                        >
                          <div className="w-full">
                            <div className="font-medium">{restaurant.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {restaurant.distance || restaurant.address}
                            </div>
                          </div>
                        </Button>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        {searchQuery.trim() && !isSearching 
                          ? "No restaurants found. Try a different search term."
                          : "No restaurants found."
                        }
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date Selection */}
        <Card className="restaurant-card">
          <CardContent className="p-4">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <div className="flex-1">
                <Label className="text-sm font-medium cursor-pointer">Date *</Label>
                <div className="mt-2">
                  <div className="text-sm text-foreground font-medium">{format(date, "PPP")}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {format(date, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDate(new Date());
                    }}
                    className="h-auto p-1 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDatePicker(!showDatePicker);
                  }}
                  className="h-auto p-1"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </div>
            
            {showDatePicker && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex gap-3">
                  {/* Month Picker */}
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground text-center block mb-3 font-medium">Month</Label>
                    <WheelPicker
                      value={date.getMonth()}
                      onChange={(month) => {
                        const newDate = new Date(date.getFullYear(), month, date.getDate());
                        /* Adjust day if it exceeds days in new month */
                        const maxDay = new Date(date.getFullYear(), month + 1, 0).getDate();
                        if (newDate.getDate() > maxDay) {
                          newDate.setDate(maxDay);
                        }
                        setDate(newDate);
                      }}
                      options={(() => {
                        /* Filter out future months if current year */
                        const today = new Date();
                        const currentYear = date.getFullYear();
                        const months = [
                          { value: 0, label: 'Jan' },
                          { value: 1, label: 'Feb' },
                          { value: 2, label: 'Mar' },
                          { value: 3, label: 'Apr' },
                          { value: 4, label: 'May' },
                          { value: 5, label: 'Jun' },
                          { value: 6, label: 'Jul' },
                          { value: 7, label: 'Aug' },
                          { value: 8, label: 'Sep' },
                          { value: 9, label: 'Oct' },
                          { value: 10, label: 'Nov' },
                          { value: 11, label: 'Dec' }
                        ];
                        if (currentYear === today.getFullYear()) {
                          return months.filter(m => m.value <= today.getMonth());
                        }
                        return months;
                      })()}
                      itemHeight={36}
                    />
                  </div>

                  {/* Day Picker */}
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground text-center block mb-3 font-medium">Day</Label>
                    <WheelPicker
                      value={date.getDate()}
                      onChange={(day) => {
                        const newDate = new Date(date.getFullYear(), date.getMonth(), day);
                        setDate(newDate);
                      }}
                      options={(() => {
                        /* Filter out future days if current month/year */
                        const today = new Date();
                        const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
                        const days = Array.from(
                          { length: maxDay },
                          (_, i) => ({ value: i + 1, label: String(i + 1) })
                        );
                        if (date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth()) {
                          return days.filter(d => d.value <= today.getDate());
                        }
                        return days;
                      })()}
                      itemHeight={36}
                    />
                  </div>

                  {/* Year Picker */}
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground text-center block mb-3 font-medium">Year</Label>
                    <WheelPicker
                      value={date.getFullYear()}
                      onChange={(year) => {
                        const newDate = new Date(year, date.getMonth(), date.getDate());
                        /* Adjust day if it exceeds days in month */
                        const maxDay = new Date(year, date.getMonth() + 1, 0).getDate();
                        if (newDate.getDate() > maxDay) {
                          newDate.setDate(maxDay);
                        }
                        setDate(newDate);
                      }}
                      options={Array.from(
                        { length: new Date().getFullYear() - 2000 + 1 },
                        (_, i) => ({ value: 2000 + i, label: String(2000 + i) })
                      )}
                      itemHeight={36}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review */}
        <Card className="restaurant-card">
          <CardContent className="p-4">
            <Label className="text-sm font-medium">Review</Label>
            <Textarea
              placeholder="Share your experience..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="mt-2 rounded-xl resize-none"
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Overall Rating */}
        <Card className="restaurant-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Overall Rating</Label>
              {ratings.overall > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRatingReset('overall')}
                  className="h-auto p-1 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="mt-2">
              <StarRating 
                value={ratings.overall} 
                onChange={(val) => handleRatingChange('overall', val)}
                category="overall"
              />
            </div>
          </CardContent>
        </Card>

        {/* Show More Ratings Button */}
        <Button
          variant="outline"
          onClick={() => setShowDetailedRatings(!showDetailedRatings)}
          className="w-full btn-secondary flex items-center justify-center"
        >
          {showDetailedRatings ? "Hide" : "Show"} Detailed Ratings
          <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showDetailedRatings ? 'rotate-180' : ''}`} />
        </Button>

        {/* Detailed Ratings */}
        {showDetailedRatings && (
          <Card className="restaurant-card">
            <CardContent className="p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Price Level</Label>
                  {ratings.priceLevel > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRatingReset('priceLevel')}
                      className="h-auto p-1 text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="mt-2">
                  <PriceLevelSelector 
                    value={ratings.priceLevel} 
                    onChange={(val) => handleRatingChange('priceLevel', val)}
                  />
                </div>
              </div>

              {[
                { key: 'valueForMoney', label: 'Value for Money' },
                { key: 'food', label: 'Food' },
                { key: 'drinks', label: 'Drinks' },
                { key: 'service', label: 'Service' },
                { key: 'atmosphere', label: 'Atmosphere' }
              ].map(({ key, label }) => (
                <div key={key}>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{label}</Label>
                    {ratings[key as keyof typeof ratings] > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRatingReset(key)}
                        className="h-auto p-1 text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-2">
                    <StarRating 
                      value={ratings[key as keyof typeof ratings]} 
                      onChange={(val) => handleRatingChange(key, val)}
                      category={key}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          className="btn-primary w-full"
          disabled={!selectedRestaurant || !date || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </Button>
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default Log;