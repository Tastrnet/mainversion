-- Change restaurants table ID to TEXT to handle Google Places IDs
ALTER TABLE public.restaurants 
ALTER COLUMN id TYPE TEXT;

-- Update reviews table foreign key to match
ALTER TABLE public.reviews 
ALTER COLUMN restaurant_id TYPE TEXT;

-- Add index on restaurant_id for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_id ON public.reviews(restaurant_id);

-- Add comment for documentation
COMMENT ON COLUMN public.restaurants.id IS 'Google Places ID or generated identifier for restaurant';
COMMENT ON COLUMN public.reviews.restaurant_id IS 'References restaurants.id (Google Places ID)';