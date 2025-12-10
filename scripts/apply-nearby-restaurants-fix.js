/**
 * Script to fix the get_nearby_restaurants RPC function
 * 
 * This script removes the google_place_id dependency from the function.
 * 
 * Usage:
 * 1. Set your Supabase service role key as an environment variable:
 *    export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 * 
 * 2. Run the script:
 *    node scripts/apply-nearby-restaurants-fix.js
 * 
 * OR provide the key directly:
 *    SUPABASE_SERVICE_ROLE_KEY="your-key" node scripts/apply-nearby-restaurants-fix.js
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://pgcfvoyajemtcyaxpefg.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// SQL to fix the function
const FIX_SQL = `
DROP FUNCTION IF EXISTS get_nearby_restaurants(float, float, int, int);

CREATE OR REPLACE FUNCTION get_nearby_restaurants(
  lat float,
  lng float,
  radius int DEFAULT 5000,
  limit_count int DEFAULT 20
)
RETURNS TABLE(
  id int,
  name text,
  address text,
  latitude numeric,
  longitude numeric,
  cuisines jsonb,
  is_featured boolean,
  distance_meters float
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.address,
    r.latitude,
    r.longitude,
    r.cuisines,
    r.is_featured,
    ST_Distance(
      r.geom::geography,
      ST_SetSRID(ST_Point(lng, lat), 4326)::geography
    ) AS distance_meters
  FROM restaurants r
  WHERE r.geom IS NOT NULL
    AND ST_DWithin(
      r.geom::geography,
      ST_SetSRID(ST_Point(lng, lat), 4326)::geography,
      radius
    )
  ORDER BY r.geom <-> ST_SetSRID(ST_Point(lng, lat), 4326)
  LIMIT limit_count;
END;
$$;
`;

async function applyFix() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set.');
    console.log('\nTo get your service role key:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to Settings > API');
    console.log('3. Copy the "service_role" key (not the anon key!)');
    console.log('\nThen run:');
    console.log('  SUPABASE_SERVICE_ROLE_KEY="your-key" node scripts/apply-nearby-restaurants-fix.js');
    process.exit(1);
  }

  try {
    console.log('🔧 Creating Supabase client...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('📝 Applying fix to get_nearby_restaurants function...');
    
    // Execute the SQL using rpc - but we need to use the management API
    // Since Supabase client doesn't support raw SQL execution, we'll use the REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql: FIX_SQL })
    });

    if (!response.ok) {
      // Try alternative: use PostgREST to execute via a helper function
      // Or better: provide instructions for SQL Editor
      console.log('⚠️  Direct SQL execution via client is not available.');
      console.log('\n📋 Please run this SQL in your Supabase SQL Editor instead:');
      console.log('\n' + '='.repeat(70));
      console.log(FIX_SQL);
      console.log('='.repeat(70) + '\n');
      console.log('Steps:');
      console.log('1. Go to https://supabase.com/dashboard');
      console.log('2. Select your project');
      console.log('3. Go to SQL Editor');
      console.log('4. Paste the SQL above and click "Run"');
      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ Fix applied successfully!');
    console.log('The get_nearby_restaurants function has been updated.');
    
  } catch (error) {
    console.error('❌ Error applying fix:', error.message);
    console.log('\n📋 Alternative: Run this SQL manually in Supabase SQL Editor:');
    console.log('\n' + '='.repeat(70));
    console.log(FIX_SQL);
    console.log('='.repeat(70) + '\n');
    process.exit(1);
  }
}

applyFix();



