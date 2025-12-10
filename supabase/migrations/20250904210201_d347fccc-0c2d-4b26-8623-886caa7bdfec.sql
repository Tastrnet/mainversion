-- Create restaurants table
CREATE TABLE public.restaurants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  cuisine_type TEXT,
  image_url TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  rating DECIMAL(2,1) NOT NULL CHECK (rating >= 0 AND rating <= 5),
  comment TEXT,
  food_rating INTEGER CHECK (food_rating >= 1 AND food_rating <= 5),
  drinks_rating INTEGER CHECK (drinks_rating >= 1 AND drinks_rating <= 5),
  service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
  atmosphere_rating INTEGER CHECK (atmosphere_rating >= 1 AND atmosphere_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, restaurant_id)
);

-- Create friends table for relationships
CREATE TABLE public.friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Create lists table
CREATE TABLE public.lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create list_restaurants junction table
CREATE TABLE public.list_restaurants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(list_id, restaurant_id)
);

-- Enable Row Level Security
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_restaurants ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurants (publicly readable)
CREATE POLICY "Restaurants are viewable by everyone" 
ON public.restaurants FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create restaurants" 
ON public.restaurants FOR INSERT TO authenticated 
WITH CHECK (true);

-- RLS policies for reviews
CREATE POLICY "Reviews are viewable by everyone" 
ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Users can create their own reviews" 
ON public.reviews FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" 
ON public.reviews FOR UPDATE TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" 
ON public.reviews FOR DELETE TO authenticated 
USING (auth.uid() = user_id);

-- RLS policies for friends
CREATE POLICY "Users can view friend relationships involving them" 
ON public.friends FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests" 
ON public.friends FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friend relationships involving them" 
ON public.friends FOR UPDATE TO authenticated 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS policies for lists
CREATE POLICY "Users can view their own lists" 
ON public.lists FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view public lists" 
ON public.lists FOR SELECT TO authenticated 
USING (is_public = true);

CREATE POLICY "Users can create their own lists" 
ON public.lists FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lists" 
ON public.lists FOR UPDATE TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lists" 
ON public.lists FOR DELETE TO authenticated 
USING (auth.uid() = user_id);

-- RLS policies for list_restaurants
CREATE POLICY "List restaurants inherit list visibility" 
ON public.list_restaurants FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.lists 
    WHERE lists.id = list_restaurants.list_id 
    AND (lists.user_id = auth.uid() OR lists.is_public = true)
  )
);

CREATE POLICY "Users can manage their own list restaurants" 
ON public.list_restaurants FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.lists 
    WHERE lists.id = list_restaurants.list_id 
    AND lists.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lists 
    WHERE lists.id = list_restaurants.list_id 
    AND lists.user_id = auth.uid()
  )
);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lists_updated_at
  BEFORE UPDATE ON public.lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample restaurants
INSERT INTO public.restaurants (name, cuisine_type, address) VALUES
('Bistro Luna', 'French', '123 Main St'),
('Sakura Sushi', 'Japanese', '456 Oak Ave'),
('The Garden', 'Vegetarian', '789 Pine Rd'),
('Café Central', 'Coffee', '321 Elm St'),
('Pizza Corner', 'Italian', '654 Maple Dr'),
('Burger House', 'American', '987 Cedar Ln'),
('Thai Palace', 'Thai', '147 Birch Way'),
('Wine Bar', 'Wine Bar', '258 Willow St');