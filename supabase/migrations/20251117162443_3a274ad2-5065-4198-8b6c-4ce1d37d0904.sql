-- Add English column names and map data from Swedish columns
/* This migration adds the expected English column names that the code uses */

-- First add timestamp columns that the trigger expects
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add missing columns with English names
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC,
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS cuisines JSONB;

-- Copy data from Swedish columns to English columns
UPDATE public.restaurants
SET 
  name = "Namn",
  address = "Full Adress",
  latitude = "Latitud",
  longitude = "Longitud",
  google_place_id = "Google Place ID"
WHERE name IS NULL;

-- Create index on commonly queried columns for better performance
CREATE INDEX IF NOT EXISTS idx_restaurants_name ON public.restaurants(name);
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON public.restaurants(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_restaurants_google_place_id ON public.restaurants(google_place_id);