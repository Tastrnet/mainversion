/**
 * API Endpoint Examples for Geospatial Restaurant Queries
 * 
 * These examples demonstrate how to use the efficient geospatial query functions
 * in API endpoints (Next.js API routes, Express, etc.)
 */

import { fetchNearbyRestaurants } from './fetchNearbyRestaurants';
import { fetchNearbyRestaurantsMongoDB } from './fetchNearbyRestaurants.mongodb';
import type { Db } from 'mongodb';

// ============================================================================
// Example 1: Next.js API Route (PostgreSQL/PostGIS)
// ============================================================================

/**
 * Next.js API Route example using Supabase/PostgreSQL with PostGIS
 * 
 * File: pages/api/nearby-restaurants.ts or app/api/nearby-restaurants/route.ts
 */
export async function nextjsApiRouteExample() {
  /*
  // pages/api/nearby-restaurants.ts
  import type { NextApiRequest, NextApiResponse } from 'next';
  import { fetchNearbyRestaurants } from '@/services/fetchNearbyRestaurants';

  export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
  ) {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { lat, lng, radius = 5000, limit = 20 } = req.query;

      // Validate input
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const searchRadius = parseInt(radius as string, 10);
      const resultLimit = parseInt(limit as string, 10);

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ 
          error: 'Invalid coordinates. Provide valid lat and lng.' 
        });
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({ 
          error: 'Coordinates out of range.' 
        });
      }

      // Fetch nearby restaurants using efficient PostGIS query
      const restaurants = await fetchNearbyRestaurants(
        latitude,
        longitude,
        searchRadius,
        resultLimit
      );

      return res.status(200).json({
        success: true,
        count: restaurants.length,
        restaurants,
        query: {
          location: { lat: latitude, lng: longitude },
          radius: searchRadius,
          limit: resultLimit
        }
      });
    } catch (error: any) {
      console.error('Error fetching nearby restaurants:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch nearby restaurants',
        message: error.message 
      });
    }
  }

  // Usage: GET /api/nearby-restaurants?lat=55.604981&lng=13.003822&radius=5000&limit=20
  */
}

// ============================================================================
// Example 2: Next.js App Router API Route (PostgreSQL/PostGIS)
// ============================================================================

/**
 * Next.js App Router API Route example
 * 
 * File: app/api/nearby-restaurants/route.ts
 */
export async function nextjsAppRouterExample() {
  /*
  // app/api/nearby-restaurants/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { fetchNearbyRestaurants } from '@/services/fetchNearbyRestaurants';

  export async function GET(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const lat = parseFloat(searchParams.get('lat') || '');
      const lng = parseFloat(searchParams.get('lng') || '');
      const radius = parseInt(searchParams.get('radius') || '5000', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);

      // Validate input
      if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json(
          { error: 'Invalid coordinates. Provide valid lat and lng.' },
          { status: 400 }
        );
      }

      // Fetch nearby restaurants
      const restaurants = await fetchNearbyRestaurants(lat, lng, radius, limit);

      return NextResponse.json({
        success: true,
        count: restaurants.length,
        restaurants,
        query: {
          location: { lat, lng },
          radius,
          limit
        }
      });
    } catch (error: any) {
      console.error('Error fetching nearby restaurants:', error);
      return NextResponse.json(
        { error: 'Failed to fetch nearby restaurants', message: error.message },
        { status: 500 }
      );
    }
  }

  // Usage: GET /api/nearby-restaurants?lat=55.604981&lng=13.003822&radius=5000&limit=20
  */
}

// ============================================================================
// Example 3: Express.js API Route (PostgreSQL/PostGIS)
// ============================================================================

/**
 * Express.js API Route example
 * 
 * File: routes/restaurants.ts
 */
export async function expressApiRouteExample() {
  /*
  // routes/restaurants.ts
  import express, { Request, Response } from 'express';
  import { fetchNearbyRestaurants } from '../services/fetchNearbyRestaurants';

  const router = express.Router();

  router.get('/nearby', async (req: Request, res: Response) => {
    try {
      const { lat, lng, radius = '5000', limit = '20' } = req.query;

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const searchRadius = parseInt(radius as string, 10);
      const resultLimit = parseInt(limit as string, 10);

      // Validate input
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ 
          error: 'Invalid coordinates. Provide valid lat and lng.' 
        });
      }

      // Fetch nearby restaurants
      const restaurants = await fetchNearbyRestaurants(
        latitude,
        longitude,
        searchRadius,
        resultLimit
      );

      res.json({
        success: true,
        count: restaurants.length,
        restaurants,
        query: {
          location: { lat: latitude, lng: longitude },
          radius: searchRadius,
          limit: resultLimit
        }
      });
    } catch (error: any) {
      console.error('Error fetching nearby restaurants:', error);
      res.status(500).json({ 
        error: 'Failed to fetch nearby restaurants',
        message: error.message 
      });
    }
  });

  export default router;

  // Usage: GET /api/restaurants/nearby?lat=55.604981&lng=13.003822&radius=5000&limit=20
  */
}

// ============================================================================
// Example 4: MongoDB API Route
// ============================================================================

/**
 * Express.js API Route example using MongoDB
 * 
 * File: routes/restaurants.ts (MongoDB version)
 */
export async function mongodbApiRouteExample() {
  /*
  // routes/restaurants.ts (MongoDB)
  import express, { Request, Response } from 'express';
  import { fetchNearbyRestaurantsMongoDB } from '../services/fetchNearbyRestaurants.mongodb';
  import { getMongoDb } from '../lib/mongodb'; // Your MongoDB connection helper

  const router = express.Router();

  router.get('/nearby', async (req: Request, res: Response) => {
    try {
      const { lat, lng, radius = '5000', limit = '20' } = req.query;

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const searchRadius = parseInt(radius as string, 10);
      const resultLimit = parseInt(limit as string, 10);

      // Validate input
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ 
          error: 'Invalid coordinates. Provide valid lat and lng.' 
        });
      }

      // Get MongoDB database instance
      const db = getMongoDb(); // Your function to get MongoDB database

      // Fetch nearby restaurants using MongoDB 2dsphere index
      const restaurants = await fetchNearbyRestaurantsMongoDB(
        db,
        latitude,
        longitude,
        searchRadius,
        resultLimit
      );

      res.json({
        success: true,
        count: restaurants.length,
        restaurants,
        query: {
          location: { lat: latitude, lng: longitude },
          radius: searchRadius,
          limit: resultLimit
        }
      });
    } catch (error: any) {
      console.error('Error fetching nearby restaurants:', error);
      res.status(500).json({ 
        error: 'Failed to fetch nearby restaurants',
        message: error.message 
      });
    }
  });

  export default router;

  // Usage: GET /api/restaurants/nearby?lat=55.604981&lng=13.003822&radius=5000&limit=20
  */
}

// ============================================================================
// Example 5: Supabase Edge Function
// ============================================================================

/**
 * Supabase Edge Function example
 * 
 * File: supabase/functions/nearby-restaurants/index.ts
 */
export async function supabaseEdgeFunctionExample() {
  /*
  // supabase/functions/nearby-restaurants/index.ts
  import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      const { lat, lng, radius = 5000, limit = 20 } = await req.json();

      // Validate input
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const searchRadius = parseInt(radius, 10);
      const resultLimit = parseInt(limit, 10);

      if (isNaN(latitude) || isNaN(longitude)) {
        return new Response(
          JSON.stringify({ error: 'Invalid coordinates. Provide valid lat and lng.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Fetch nearby restaurants using PostGIS RPC
      const { data, error } = await supabase.rpc('get_nearby_restaurants', {
        lat: latitude,
        lng: longitude,
        radius: searchRadius,
        limit_count: resultLimit
      });

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          count: data?.length || 0,
          restaurants: data || [],
          query: {
            location: { lat: latitude, lng: longitude },
            radius: searchRadius,
            limit: resultLimit
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      console.error('Error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch nearby restaurants', message: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  });

  // Usage: POST /functions/v1/nearby-restaurants
  // Body: { "lat": 55.604981, "lng": 13.003822, "radius": 5000, "limit": 20 }
  */
}



