-- Rename cuisine column to tags in restaurants table
ALTER TABLE public.restaurants RENAME COLUMN cuisine TO tags;