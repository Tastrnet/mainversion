-- Fix existing unidirectional friendships by creating reverse entries
INSERT INTO friends (user_id, friend_id, status, created_at)
SELECT 
  f.friend_id,
  f.user_id,
  f.status,
  f.created_at
FROM friends f
WHERE NOT EXISTS (
  SELECT 1 FROM friends f2 
  WHERE f2.user_id = f.friend_id 
  AND f2.friend_id = f.user_id
);

-- Create some test review data for the friend user
-- First, create a test restaurant
INSERT INTO restaurants (id, name, address, latitude, longitude)
VALUES ('test-restaurant-1', 'Test Bistro', '123 Main St', 40.7128, -74.0060)
ON CONFLICT (id) DO NOTHING;

-- Create a test review from the friend user
INSERT INTO reviews (
  user_id, 
  restaurant_id, 
  rating, 
  comment, 
  created_at
) VALUES (
  'da097934-3bfb-4dc1-b720-55623c48042a',
  'test-restaurant-1',
  4.5,
  'Great food and atmosphere! Had the salmon and it was perfectly cooked. Service was excellent and the ambiance was perfect for a date night.',
  NOW() - INTERVAL '2 days'
)
ON CONFLICT DO NOTHING;