import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RestaurantClickExample } from "@/components/RestaurantClickExample";
import MobileNavigation from "@/components/MobileNavigation";
import { RestaurantService } from "@/services/RestaurantService";
import { toast } from "sonner";

const RestaurantDemo = () => {
  const navigate = useNavigate();
  const [googlePlaceId, setGooglePlaceId] = useState("ChIJ2eUgeAK6j4ARbn5u_wAGqWA"); // Example: The Cheesecake Factory
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTestFetch = async () => {
    if (!googlePlaceId.trim()) {
      toast.error("Please enter a Google Place ID");
      return;
    }

    setLoading(true);
    try {
      const restaurant = await RestaurantService.fetchRestaurantByGooglePlaceId(googlePlaceId);
      setTestResult(restaurant);
      toast.success("Restaurant fetched successfully!");
    } catch (error) {
      console.error('Test fetch error:', error);
      toast.error("Failed to fetch restaurant");
      setTestResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
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
          <h1 className="text-xl font-semibold">Restaurant Google Places Demo</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Integration Examples */}
        <RestaurantClickExample showExamples={true} />

        {/* Test Section */}
        <Card>
          <CardHeader>
            <CardTitle>Test Google Places Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="placeId">Google Place ID</Label>
              <Input
                id="placeId"
                value={googlePlaceId}
                onChange={(e) => setGooglePlaceId(e.target.value)}
                placeholder="Enter a Google Place ID (e.g., ChIJ2eUgeAK6j4ARbn5u_wAGqWA)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Example Place IDs:
                <br />• ChIJ2eUgeAK6j4ARbn5u_wAGqWA (The Cheesecake Factory)
                <br />• ChIJN1t_tDeuEmsRUsoyG83frY4 (Google Sydney)
              </p>
            </div>

            <Button onClick={handleTestFetch} disabled={loading}>
              {loading ? "Fetching..." : "Test Fetch Restaurant"}
            </Button>

            {testResult && (
              <div className="mt-4">
                <Label>Result:</Label>
                <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Example Restaurant Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Example Restaurant Cards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Card with Google Place ID */}
            <RestaurantClickExample 
              restaurant={{
                google_place_id: "ChIJ2eUgeAK6j4ARbn5u_wAGqWA",
                name: "The Cheesecake Factory",
                address: "8500 Beverly Blvd, Los Angeles, CA"
              }}
            />

            {/* Card with just Google Place ID */}
            <RestaurantClickExample 
              googlePlaceId="ChIJN1t_tDeuEmsRUsoyG83frY4"
            />

            {/* Card with internal ID (existing functionality) */}
            <RestaurantClickExample 
              restaurant={{
                id: "rest_001",
                name: "Local Restaurant (Database Only)",
                address: "123 Local Street"
              }}
            />
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-3">
              <div>
                <strong>1. User clicks restaurant:</strong>
                <p>App navigates to /restaurant/loading?googlePlaceId=PLACE_ID</p>
              </div>
              
              <div>
                <strong>2. Restaurant page loads:</strong>
                <p>RestaurantService.fetchRestaurantByGooglePlaceId() is called</p>
              </div>
              
              <div>
                <strong>3. Edge function checks database:</strong>
                <p>• If restaurant exists: return cached data</p>
                <p>• If not found: fetch from Google Places API</p>
              </div>
              
              <div>
                <strong>4. Google Places data:</strong>
                <p>• Fetch name, address, coordinates</p>
                <p>• Save to database with both Google ID and internal ID</p>
                <p>• Return restaurant data</p>
              </div>
              
              <div>
                <strong>5. URL updates:</strong>
                <p>Navigate to /restaurant/INTERNAL_ID for consistent URLs</p>
              </div>
              
              <div>
                <strong>6. Refresh capability:</strong>
                <p>Users can refresh data from Google Places when needed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default RestaurantDemo;