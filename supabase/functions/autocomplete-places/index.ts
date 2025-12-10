import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutocompleteRequest {
  input: string;
  location?: { lat: number; lng: number };
  radius?: number;
  types?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input, location, radius = 50000, types = ['restaurant', 'food'] }: AutocompleteRequest = await req.json();

    if (!input || input.length < 2) {
      return new Response(
        JSON.stringify({ predictions: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Autocomplete request:', { input, location, types });

    // Get Google Maps API key
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!googleMapsApiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchParams = new URLSearchParams({
      input: input.trim(),
      key: googleMapsApiKey,
      types: types.join('|')
    });

    // Add location bias if provided
    if (location) {
      searchParams.append('location', `${location.lat},${location.lng}`);
      searchParams.append('radius', radius.toString());
    }

    const googlePlacesUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${searchParams.toString()}`;
    console.log('Calling Google Places Autocomplete API');

    const googleResponse = await fetch(googlePlacesUrl);
    const googleData = await googleResponse.json();

    if (!googleResponse.ok) {
      console.error('Google Places Autocomplete API HTTP error:', googleResponse.status);
      return new Response(
        JSON.stringify({ 
          error: 'Google Places Autocomplete API request failed',
          predictions: []
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (googleData.status !== 'OK') {
      console.error('Google Places Autocomplete API error:', googleData.status, googleData.error_message);
      
      if (googleData.status === 'ZERO_RESULTS') {
        return new Response(
          JSON.stringify({ predictions: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: `Google Places Autocomplete API error: ${googleData.error_message || googleData.status}`,
          predictions: []
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const predictions = googleData.predictions || [];
    console.log(`Found ${predictions.length} autocomplete suggestions`);

    return new Response(
      JSON.stringify({ predictions }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Autocomplete error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        predictions: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});