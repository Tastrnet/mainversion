-- Clear all existing data
DELETE FROM user_favorites;
DELETE FROM list_restaurants;
DELETE FROM lists;
DELETE FROM reviews;
DELETE FROM friends;
DELETE FROM profiles;
DELETE FROM restaurants;

-- Insert 50 dummy restaurants with realistic names and varied data
INSERT INTO restaurants (id, name, address, cuisine_type, latitude, longitude, image_url) VALUES
('rest_001', 'The Rustic Table', '123 Oak Street, Downtown', 'American', 40.7589, -73.9851, 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400'),
('rest_002', 'Sakura Sushi & Ramen', '456 Cherry Blossom Ave', 'Japanese', 40.7614, -73.9776, 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=400'),
('rest_003', 'Nonna''s Kitchen', '789 Little Italy Way', 'Italian', 40.7505, -73.9934, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400'),
('rest_004', 'Spice Route', '321 Curry Lane', 'Indian', 40.7282, -74.0776, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400'),
('rest_005', 'Le Petit Bistro', '654 French Quarter St', 'French', 40.7505, -73.9863, 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400'),
('rest_006', 'Dragon Palace', '987 Chinatown Rd', 'Chinese', 40.7157, -74.0023, 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400'),
('rest_007', 'Taco Libre', '159 Fiesta Street', 'Mexican', 40.7282, -73.7949, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400'),
('rest_008', 'Mediterranean Breeze', '753 Olive Grove Ave', 'Mediterranean', 40.7505, -73.9776, 'https://images.unsplash.com/photo-1544510820-3c3b24451621?w=400'),
('rest_009', 'Seoul Kitchen BBQ', '852 K-Town Plaza', 'Korean', 40.7549, -73.9840, 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400'),
('rest_010', 'The Burger Joint', '147 Grill Street', 'American', 40.7614, -73.9598, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'),
('rest_011', 'Bella Vista Ristorante', '258 Vineyard Heights', 'Italian', 40.7291, -73.9965, 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400'),
('rest_012', 'Pho Saigon', '369 Vietnam Street', 'Vietnamese', 40.7505, -73.9711, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400'),
('rest_013', 'El Corazón', '741 Tapas Plaza', 'Spanish', 40.7282, -73.9942, 'https://images.unsplash.com/photo-1512152272829-e3139592d56f?w=400'),
('rest_014', 'Bangkok Street Food', '963 Spice Market', 'Thai', 40.7505, -73.9934, 'https://images.unsplash.com/photo-1562565652-a0d8c479fbc4?w=400'),
('rest_015', 'The Steakhouse Prime', '852 Butcher Block Ave', 'Steakhouse', 40.7589, -73.9776, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400'),
('rest_016', 'Café Lumière', '174 Coffee Bean Street', 'Cafe', 40.7614, -73.9851, 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400'),
('rest_017', 'Himalayan Heights', '285 Mountain View Rd', 'Nepalese', 40.7505, -73.9598, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400'),
('rest_018', 'Fish & Chips Co.', '396 Harbor Street', 'British', 40.7282, -74.0059, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400'),
('rest_019', 'Gyros & More', '507 Athens Plaza', 'Greek', 40.7505, -73.9711, 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400'),
('rest_020', 'BBQ Smokehouse', '618 Pit Master Lane', 'BBQ', 40.7614, -73.9942, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400'),
('rest_021', 'Samba Grill', '729 Carnival Street', 'Brazilian', 40.7291, -73.9863, 'https://images.unsplash.com/photo-1558030006-450675393462?w=400'),
('rest_022', 'The Waffle House', '840 Breakfast Blvd', 'Breakfast', 40.7505, -73.9840, 'https://images.unsplash.com/photo-1541288097308-7b8e3f58c4c6?w=400'),
('rest_023', 'Ramen Ichiban', '951 Noodle Alley', 'Japanese', 40.7589, -73.9598, 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=400'),
('rest_024', 'Pizza Margherita', '162 Mozzarella Drive', 'Italian', 40.7282, -73.9776, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400'),
('rest_025', 'Curry Palace', '273 Saffron Street', 'Indian', 40.7505, -74.0023, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400'),
('rest_026', 'Le Croissant Doré', '384 Patisserie Ave', 'French', 40.7614, -73.9711, 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=400'),
('rest_027', 'Szechuan Garden', '495 Peppercorn Plaza', 'Chinese', 40.7291, -73.9934, 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400'),
('rest_028', 'Cantina Rosa', '506 Margarita Street', 'Mexican', 40.7505, -73.9851, 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=400'),
('rest_029', 'Santorini Taverna', '617 Aegean Way', 'Greek', 40.7589, -73.9942, 'https://images.unsplash.com/photo-1544510820-3c3b24451621?w=400'),
('rest_030', 'Seoul Garden', '728 Kimchi Lane', 'Korean', 40.7282, -73.9863, 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400'),
('rest_031', 'The Breakfast Club', '839 Morning Glory St', 'American', 40.7505, -73.9598, 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400'),
('rest_032', 'Truffle & Wine', '940 Gourmet Grove', 'Fine Dining', 40.7614, -74.0059, 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400'),
('rest_033', 'Pad Thai Express', '151 Bangkok Boulevard', 'Thai', 40.7291, -73.9776, 'https://images.unsplash.com/photo-1562565652-a0d8c479fbc4?w=400'),
('rest_034', 'Mama Rosa''s Pizzeria', '262 Family Recipe Rd', 'Italian', 40.7505, -73.9711, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400'),
('rest_035', 'Bombay Express', '373 Masala Market', 'Indian', 40.7589, -73.9934, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400'),
('rest_036', 'Chez Laurent', '484 Bordeaux Street', 'French', 40.7282, -73.9851, 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=400'),
('rest_037', 'Golden Dragon', '595 Fortune Cookie Ave', 'Chinese', 40.7505, -73.9942, 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400'),
('rest_038', 'Casa Miguel', '606 Salsa Street', 'Mexican', 40.7614, -73.9863, 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=400'),
('rest_039', 'Mykonos Blue', '717 Island Breeze Blvd', 'Greek', 40.7291, -73.9598, 'https://images.unsplash.com/photo-1544510820-3c3b24451621?w=400'),
('rest_040', 'Gangnam Style BBQ', '828 Seoul Plaza', 'Korean', 40.7505, -74.0023, 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400'),
('rest_041', 'The Farm Table', '939 Organic Way', 'Farm-to-Table', 40.7589, -73.9776, 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400'),
('rest_042', 'Sushi Zen', '150 Bamboo Grove', 'Japanese', 40.7282, -73.9711, 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=400'),
('rest_043', 'Little Saigon', '261 Pho Street', 'Vietnamese', 40.7505, -73.9934, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400'),
('rest_044', 'Tapas Barcelona', '372 Rambla Road', 'Spanish', 40.7614, -73.9851, 'https://images.unsplash.com/photo-1512152272829-e3139592d56f?w=400'),
('rest_045', 'Thai Orchid', '483 Lotus Lane', 'Thai', 40.7291, -73.9942, 'https://images.unsplash.com/photo-1562565652-a0d8c479fbc4?w=400'),
('rest_046', 'Prime Cut Steakhouse', '594 Ribeye Road', 'Steakhouse', 40.7505, -73.9863, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400'),
('rest_047', 'Morning Glory Café', '605 Sunrise Street', 'Cafe', 40.7589, -73.9598, 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400'),
('rest_048', 'Everest Base Camp', '716 Mountain Peak Dr', 'Nepalese', 40.7282, -74.0059, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400'),
('rest_049', 'The Crown & Anchor', '827 Pub Lane', 'British', 40.7505, -73.9776, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400'),
('rest_050', 'Acropolis Grill', '938 Parthenon Plaza', 'Greek', 40.7614, -73.9711, 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400');