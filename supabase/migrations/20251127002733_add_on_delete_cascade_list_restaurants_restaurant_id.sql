-- Add ON DELETE CASCADE to list_restaurants_restaurant_id_fkey foreign key constraint
-- This allows restaurants to be deleted and automatically removes them from lists

-- Step 1: Drop the existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'list_restaurants_restaurant_id_fkey' 
        AND table_name = 'list_restaurants'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.list_restaurants DROP CONSTRAINT list_restaurants_restaurant_id_fkey;
    END IF;
END $$;

-- Step 2: Recreate the foreign key constraint with ON DELETE CASCADE
ALTER TABLE public.list_restaurants
ADD CONSTRAINT list_restaurants_restaurant_id_fkey 
FOREIGN KEY (restaurant_id) 
REFERENCES public.restaurants(id) 
ON DELETE CASCADE;








