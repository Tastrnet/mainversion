-- Add is_ranked column to lists table to support ranked/unranked lists
ALTER TABLE public.lists 
ADD COLUMN is_ranked boolean NOT NULL DEFAULT false;