-- Add a favorites column to store top 4 favorite restaurants
ALTER TABLE public.profiles 
ADD COLUMN favorites jsonb DEFAULT '[]'::jsonb;