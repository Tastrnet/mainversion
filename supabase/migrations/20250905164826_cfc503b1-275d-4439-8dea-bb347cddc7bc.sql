-- Add value_for_money_rating column to reviews table
ALTER TABLE public.reviews 
ADD COLUMN value_for_money_rating integer;

-- Add comment for documentation
COMMENT ON COLUMN public.reviews.value_for_money_rating IS 'User rating for value for money (1-5 scale)';

-- Update the updated_at trigger to include the new column  
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;