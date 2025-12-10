-- Add ON DELETE CASCADE to reviews_restaurant_id_fkey foreign key constraint
-- This allows restaurants to be deleted and automatically deletes associated reviews

-- Step 1: Drop the existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_restaurant_id_fkey' 
        AND table_name = 'reviews'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.reviews DROP CONSTRAINT reviews_restaurant_id_fkey;
    END IF;
END $$;

-- Step 2: Recreate the foreign key constraint with ON DELETE CASCADE
ALTER TABLE public.reviews
ADD CONSTRAINT reviews_restaurant_id_fkey 
FOREIGN KEY (restaurant_id) 
REFERENCES public.restaurants(id) 
ON DELETE CASCADE;

