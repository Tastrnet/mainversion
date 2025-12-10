-- Add google_place_id to restaurants table for Google Places API integration
ALTER TABLE public.restaurants ADD COLUMN google_place_id TEXT UNIQUE;

-- Create index for faster lookups by Google Place ID
CREATE INDEX idx_restaurants_google_place_id ON public.restaurants(google_place_id);

-- Add a trigger to auto-update updated_at if we add that column later
-- For now, we'll keep the existing structure but prepare for Google integration