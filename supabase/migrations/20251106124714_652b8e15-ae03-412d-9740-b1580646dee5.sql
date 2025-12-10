-- Remove photos column from reviews table
ALTER TABLE public.reviews DROP COLUMN IF EXISTS photos;