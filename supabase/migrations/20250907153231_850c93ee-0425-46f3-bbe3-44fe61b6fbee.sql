-- First, let's check if there are any existing records that might cause issues
-- We need to handle the data migration carefully

-- Step 1: Drop the foreign key constraint if it exists
-- (This will allow us to modify the column types)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%reviews_restaurant_id_fkey%' 
        AND table_name = 'reviews'
    ) THEN
        ALTER TABLE public.reviews DROP CONSTRAINT reviews_restaurant_id_fkey;
    END IF;
END $$;

-- Step 2: Create a new restaurants table with TEXT ID
CREATE TABLE IF NOT EXISTS public.restaurants_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    cuisine_type TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 3: Copy existing data if any (converting UUIDs to text)
INSERT INTO public.restaurants_new (id, name, address, latitude, longitude, cuisine_type, image_url, created_at, updated_at)
SELECT id::text, name, address, latitude, longitude, cuisine_type, image_url, created_at, updated_at
FROM public.restaurants
ON CONFLICT (id) DO NOTHING;

-- Step 4: Create a new reviews table with TEXT restaurant_id
CREATE TABLE IF NOT EXISTS public.reviews_new (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    restaurant_id TEXT NOT NULL,
    rating NUMERIC NOT NULL,
    food_rating INTEGER,
    drinks_rating INTEGER,
    service_rating INTEGER,
    atmosphere_rating INTEGER,
    value_for_money_rating INTEGER,
    price_level INTEGER,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 5: Copy existing review data if any
INSERT INTO public.reviews_new (id, user_id, restaurant_id, rating, food_rating, drinks_rating, service_rating, atmosphere_rating, value_for_money_rating, price_level, comment, created_at, updated_at)
SELECT id, user_id, restaurant_id::text, rating, food_rating, drinks_rating, service_rating, atmosphere_rating, value_for_money_rating, price_level, comment, created_at, updated_at
FROM public.reviews
ON CONFLICT (id) DO NOTHING;

-- Step 6: Drop old tables and rename new ones
DROP TABLE IF EXISTS public.reviews;
DROP TABLE IF EXISTS public.restaurants;

ALTER TABLE public.restaurants_new RENAME TO restaurants;
ALTER TABLE public.reviews_new RENAME TO reviews;

-- Step 7: Recreate RLS policies for restaurants
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurants are viewable by everyone" 
ON public.restaurants 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create restaurants" 
ON public.restaurants 
FOR INSERT 
WITH CHECK (true);

-- Step 8: Recreate RLS policies for reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone" 
ON public.reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own reviews" 
ON public.reviews 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" 
ON public.reviews 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" 
ON public.reviews 
FOR DELETE 
USING (auth.uid() = user_id);

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_id ON public.reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at);

-- Step 10: Create update trigger for reviews
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Step 11: Create update trigger for restaurants  
CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON public.restaurants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Step 12: Add helpful comments
COMMENT ON COLUMN public.restaurants.id IS 'Google Places ID or custom identifier for restaurant';
COMMENT ON COLUMN public.reviews.restaurant_id IS 'References restaurants.id (Google Places ID or custom identifier)';
COMMENT ON TABLE public.restaurants IS 'Restaurant information from Google Places API or user input';
COMMENT ON TABLE public.reviews IS 'User reviews and ratings for restaurants';