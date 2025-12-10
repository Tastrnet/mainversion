-- Add price_level column to reviews table to allow users to rate restaurant price levels
ALTER TABLE public.reviews 
ADD COLUMN price_level integer CHECK (price_level >= 1 AND price_level <= 4);