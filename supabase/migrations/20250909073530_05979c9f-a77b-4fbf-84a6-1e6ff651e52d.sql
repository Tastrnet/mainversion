-- Update detailed rating columns to support decimal values (half stars)
ALTER TABLE reviews 
ALTER COLUMN food_rating TYPE numeric,
ALTER COLUMN drinks_rating TYPE numeric,
ALTER COLUMN service_rating TYPE numeric,
ALTER COLUMN atmosphere_rating TYPE numeric,
ALTER COLUMN value_for_money_rating TYPE numeric;