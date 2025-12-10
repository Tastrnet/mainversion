-- Step 1: Handle the foreign key constraint that's preventing us from modifying restaurants table
-- Drop the constraint from list_restaurants table
ALTER TABLE public.list_restaurants DROP CONSTRAINT IF EXISTS list_restaurants_restaurant_id_fkey;

-- Step 2: Change restaurant_id column in list_restaurants to TEXT to match our new structure
ALTER TABLE public.list_restaurants ALTER COLUMN restaurant_id TYPE TEXT;

-- Step 3: Now we can safely modify the restaurants table
-- First backup any existing data (if any)
CREATE TEMPORARY TABLE restaurants_backup AS SELECT * FROM public.restaurants;

-- Drop and recreate restaurants table with TEXT id
DROP TABLE public.restaurants CASCADE;

CREATE TABLE public.restaurants (
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

-- Step 4: Restore any existing data (convert UUID to text)
INSERT INTO public.restaurants (id, name, address, latitude, longitude, cuisine_type, image_url, created_at, updated_at)
SELECT id::text, name, address, latitude, longitude, cuisine_type, image_url, created_at, updated_at
FROM restaurants_backup;

-- Step 5: Recreate reviews table with TEXT restaurant_id
CREATE TEMPORARY TABLE reviews_backup AS SELECT * FROM public.reviews;

DROP TABLE public.reviews CASCADE;

CREATE TABLE public.reviews (
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

-- Step 6: Restore reviews data (convert restaurant_id UUID to text)
INSERT INTO public.reviews (id, user_id, restaurant_id, rating, food_rating, drinks_rating, service_rating, atmosphere_rating, value_for_money_rating, price_level, comment, created_at, updated_at)
SELECT id, user_id, restaurant_id::text, rating, food_rating, drinks_rating, service_rating, atmosphere_rating, value_for_money_rating, price_level, comment, created_at, updated_at
FROM reviews_backup;

-- Step 7: Enable RLS and recreate policies for restaurants
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurants are viewable by everyone" 
ON public.restaurants 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create restaurants" 
ON public.restaurants 
FOR INSERT 
WITH CHECK (true);

-- Step 8: Enable RLS and recreate policies for reviews  
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

-- Step 9: Create triggers for updated_at columns
CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON public.restaurants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Step 10: Create helpful indexes
CREATE INDEX idx_reviews_restaurant_id ON public.reviews(restaurant_id);
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at);

-- Step 11: Add documentation comments
COMMENT ON COLUMN public.restaurants.id IS 'Google Places ID or custom identifier for restaurant';
COMMENT ON COLUMN public.reviews.restaurant_id IS 'References restaurants.id (Google Places ID or custom identifier)';

-- Drop temporary tables
DROP TABLE restaurants_backup;
DROP TABLE reviews_backup;