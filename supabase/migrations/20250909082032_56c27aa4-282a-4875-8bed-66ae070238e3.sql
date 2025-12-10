-- Clean up orphaned favorites that don't have corresponding reviews
DELETE FROM user_favorites 
WHERE NOT EXISTS (
  SELECT 1 FROM reviews 
  WHERE reviews.restaurant_id = user_favorites.restaurant_id 
  AND reviews.user_id = user_favorites.user_id
);