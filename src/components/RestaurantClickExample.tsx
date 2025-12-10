import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { RestaurantService } from "@/services/RestaurantService";
import { toast } from "sonner";
import { Loader2, MapPin, Star } from "lucide-react";
import { useState } from "react";

interface RestaurantClickExampleProps {
  // Example of different ways to pass restaurant data
  restaurant?: {
    id?: string;
    google_place_id?: string;
    name: string;
    address?: string;
  };
  // Or just a Google Place ID directly
  googlePlaceId?: string;
  // Display mode
  showExamples?: boolean;
}

export const RestaurantClickExample = ({ 
  restaurant, 
  googlePlaceId, 
  showExamples = false 
}: RestaurantClickExampleProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Handle clicking on a restaurant - this is the main integration function
  const handleRestaurantClick = async () => {
    setLoading(true);
    
    try {
      // Determine what data we have
      const placeId = restaurant?.google_place_id || googlePlaceId;
      const internalId = restaurant?.id;

      if (placeId) {
        // Option 1: We have a Google Place ID
        // Navigate directly to restaurant page with Google Place ID parameter
        // The Restaurant page will handle fetching/creating the restaurant record
        console.log('Navigating with Google Place ID:', placeId);
        navigate(`/restaurant/loading?googlePlaceId=${placeId}`);
        
      } else if (internalId) {
        // Option 2: We have an internal restaurant ID
        // Navigate directly to the existing restaurant page
        console.log('Navigating with internal ID:', internalId);
        navigate(`/restaurant/${internalId}`);
        
      } else {
        // Option 3: Manual data fetching (alternative approach)
        // You could also fetch the restaurant data first, then navigate
        if (restaurant?.name) {
          toast.error("Need Google Place ID or restaurant ID to view details");
        }
      }
    } catch (error) {
      console.error('Error handling restaurant click:', error);
      toast.error("Failed to load restaurant details");
    } finally {
      setLoading(false);
    }
  };

  // Alternative approach: Fetch data first, then navigate
  const handleRestaurantClickWithPreFetch = async () => {
    const placeId = restaurant?.google_place_id || googlePlaceId;
    if (!placeId) {
      toast.error("Google Place ID required for this action");
      return;
    }

    setLoading(true);
    
    try {
      // Fetch restaurant data first
      const restaurantData = await RestaurantService.fetchRestaurantByGooglePlaceId(placeId);
      
      // Then navigate with the internal ID
      navigate(`/restaurant/${restaurantData.id}`);
      
    } catch (error) {
      console.error('Error pre-fetching restaurant:', error);
      toast.error("Failed to load restaurant details");
    } finally {
      setLoading(false);
    }
  };

  if (showExamples) {
    return (
      <div className="space-y-4 p-4">
        <h3 className="text-lg font-semibold mb-4">Restaurant Integration Examples</h3>
        
        {/* Example 1: Direct navigation (recommended) */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">Method 1: Direct Navigation (Recommended)</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Navigate directly to restaurant page with Google Place ID. 
              The page handles fetching and caching automatically.
            </p>
            <Button onClick={handleRestaurantClick} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Open Restaurant (Direct)
            </Button>
          </CardContent>
        </Card>

        {/* Example 2: Pre-fetch approach */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">Method 2: Pre-fetch Data</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Fetch restaurant data first, then navigate. 
              Useful when you need the data before navigation.
            </p>
            <Button onClick={handleRestaurantClickWithPreFetch} disabled={loading} variant="outline">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Open Restaurant (Pre-fetch)
            </Button>
          </CardContent>
        </Card>

        {/* Code examples */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">Code Examples</h4>
            <div className="text-sm space-y-2">
              <div>
                <strong>Direct Navigation:</strong>
                <code className="block bg-muted p-2 rounded mt-1">
                  {`navigate(\`/restaurant/loading?googlePlaceId=\${placeId}\`)`}
                </code>
              </div>
              <div>
                <strong>Service Usage:</strong>
                <code className="block bg-muted p-2 rounded mt-1">
                  {`const restaurant = await RestaurantService.fetchRestaurantByGooglePlaceId(placeId)`}
                </code>
              </div>
              <div>
                <strong>Refresh Data:</strong>
                <code className="block bg-muted p-2 rounded mt-1">
                  {`const updated = await RestaurantService.refreshRestaurantData(placeId)`}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Regular restaurant card display
  if (restaurant) {
    return (
      <Card 
        className="restaurant-card cursor-pointer hover:shadow-md transition-shadow" 
        onClick={handleRestaurantClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-foreground">{restaurant.name}</h3>
              {restaurant.address && (
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span>{restaurant.address}</span>
                </div>
              )}
              {restaurant.google_place_id && (
                <div className="text-xs text-muted-foreground mt-1">
                  Google Places integrated ✓
                </div>
              )}
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};

/* Example usage in your components:

// With Google Place ID
<RestaurantClickExample 
  googlePlaceId="ChIJN1t_tDeuEmsRUsoyG83frY4" 
/>

// With restaurant object  
<RestaurantClickExample 
  restaurant={{
    id: "rest_123",
    google_place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    name: "Example Restaurant",
    address: "123 Main St"
  }}
/>

// Show examples and documentation
<RestaurantClickExample showExamples={true} />

*/