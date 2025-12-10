import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GooglePlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface RestaurantData {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  google_place_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { googlePlaceId, forceRefresh = false } = await req.json();

    if (!googlePlaceId) {
      return new Response(
        JSON.stringify({ error: 'Google Place ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching restaurant data for Google Place ID:', googlePlaceId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if restaurant exists in database (unless force refresh is requested)
    if (!forceRefresh) {
      console.log('Checking if restaurant exists in database...');
      const { data: existingRestaurant, error: dbError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('google_place_id', googlePlaceId)
        .maybeSingle();

      if (dbError) {
        console.error('Database error:', dbError);
        return new Response(
          JSON.stringify({ error: 'Database error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingRestaurant) {
        console.log('Restaurant found in database:', existingRestaurant.name);
        return new Response(
          JSON.stringify({ restaurant: existingRestaurant, source: 'database' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Restaurant not in database or force refresh - fetch from Google Places API
    console.log('Fetching from Google Places API...');
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!googleMapsApiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googlePlacesUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=place_id,name,formatted_address,geometry&key=${googleMapsApiKey}`;

    const googleResponse = await fetch(googlePlacesUrl);
    const googleData = await googleResponse.json();

    if (googleData.status !== 'OK' || !googleData.result) {
      console.error('Google Places API error:', googleData.status, googleData.error_message);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch restaurant data from Google Places', 
          details: googleData.error_message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const placeDetails: GooglePlaceDetails = googleData.result;

    // Generate internal restaurant ID
    const restaurantId = `place_${googlePlaceId}`;

    const restaurantData: RestaurantData = {
      id: restaurantId,
      name: placeDetails.name,
      address: placeDetails.formatted_address,
      latitude: placeDetails.geometry.location.lat,
      longitude: placeDetails.geometry.location.lng,
      google_place_id: googlePlaceId,
    };

    // Save/Update restaurant in database
    console.log('Saving restaurant to database:', restaurantData.name);
    
    if (forceRefresh) {
      // Update existing restaurant
      const { data: updatedRestaurant, error: updateError } = await supabase
        .from('restaurants')
        .update({
          name: restaurantData.name,
          address: restaurantData.address,
          latitude: restaurantData.latitude,
          longitude: restaurantData.longitude,
        })
        .eq('google_place_id', googlePlaceId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating restaurant:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update restaurant in database' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ restaurant: updatedRestaurant, source: 'google_updated' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Insert new restaurant
      const { data: newRestaurant, error: insertError } = await supabase
        .from('restaurants')
        .insert({
          id: restaurantData.id,
          name: restaurantData.name,
          address: restaurantData.address,
          latitude: restaurantData.latitude,
          longitude: restaurantData.longitude,
          google_place_id: googlePlaceId,
          is_featured: false,
          user_id: null, // System-created restaurant
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting restaurant:', insertError);
        
        // Handle case where restaurant might have been inserted by another request
        if (insertError.code === '23505') { // Unique constraint violation
          const { data: existingRestaurant } = await supabase
            .from('restaurants')
            .select('*')
            .eq('google_place_id', googlePlaceId)
            .single();
            
          return new Response(
            JSON.stringify({ restaurant: existingRestaurant, source: 'database' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ error: 'Failed to save restaurant to database' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Restaurant saved successfully:', newRestaurant.name);
      return new Response(
        JSON.stringify({ restaurant: newRestaurant, source: 'google_new' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});