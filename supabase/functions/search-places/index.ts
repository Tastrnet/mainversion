import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GooglePlaceSearchRequest {
  query?: string;
  location?: { lat: number; lng: number };
  radius?: number;
  type?: string;
  keyword?: string;
}

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: Array<{
    photo_reference: string;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: GooglePlaceSearchRequest = await req.json();
    const { query, location, radius = 50000, type = 'restaurant', keyword } = requestData;

    console.log('Places search request:', { query, location, radius, type, keyword });

    // Get Google Maps API key
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!googleMapsApiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let googlePlacesUrl: string;
    let searchParams: URLSearchParams;

    if (query) {
      // Text search for restaurants
      googlePlacesUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
      searchParams = new URLSearchParams({
        query: `${query} restaurant`,
        key: googleMapsApiKey,
        type: 'restaurant'
      });

      // Add location bias if provided
      if (location) {
        searchParams.append('location', `${location.lat},${location.lng}`);
        searchParams.append('radius', radius.toString());
      }
    } else if (location) {
      // Nearby search for restaurants
      googlePlacesUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
      searchParams = new URLSearchParams({
        location: `${location.lat},${location.lng}`,
        radius: radius.toString(),
        type: 'restaurant',
        key: googleMapsApiKey
      });

      if (keyword) {
        searchParams.append('keyword', keyword);
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Either query or location must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fullUrl = `${googlePlacesUrl}?${searchParams.toString()}`;
    console.log('Calling Google Places API:', fullUrl.replace(googleMapsApiKey, 'API_KEY_HIDDEN'));

    const googleResponse = await fetch(fullUrl);
    const googleData = await googleResponse.json();

    if (!googleResponse.ok) {
      console.error('Google Places API HTTP error:', googleResponse.status);
      return new Response(
        JSON.stringify({ 
          error: 'Google Places API request failed',
          status: googleResponse.status 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (googleData.status !== 'OK') {
      console.error('Google Places API error:', googleData.status, googleData.error_message);
      
      // Handle specific API errors
      if (googleData.status === 'ZERO_RESULTS') {
        return new Response(
          JSON.stringify({ 
            results: [],
            status: 'OK' // Return OK with empty results
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: `Google Places API error: ${googleData.error_message || googleData.status}`,
          status: googleData.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: GooglePlaceResult[] = googleData.results || [];
    console.log(`Found ${results.length} places from Google Places API`);

    // Filter and enhance results
    const restaurantResults = results
      .filter((place: GooglePlaceResult) => {
        // Ensure it's a restaurant/food establishment
        return place.types?.some(type => 
          ['restaurant', 'food', 'meal_delivery', 'meal_takeaway', 'cafe', 'bakery']
            .includes(type)
        );
      })
      .slice(0, 20); // Limit to 20 results

    return new Response(
      JSON.stringify({ 
        results: restaurantResults,
        status: 'OK'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Places search error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});