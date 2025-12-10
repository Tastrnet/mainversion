-- Update existing restaurants with Copenhagen area coordinates (no fake restaurants, just coordinates for existing ones)
UPDATE restaurants 
SET latitude = 55.4202, longitude = 12.8584 
WHERE name = 'Bistro Luna';

UPDATE restaurants 
SET latitude = 55.4182, longitude = 12.8594 
WHERE name = 'Sakura Sushi';

UPDATE restaurants 
SET latitude = 55.4212, longitude = 12.8574 
WHERE name = 'The Garden';

UPDATE restaurants 
SET latitude = 55.4222, longitude = 12.8564 
WHERE name = 'Café Central';

UPDATE restaurants 
SET latitude = 55.4232, longitude = 12.8554 
WHERE name = 'Pizza Corner';

UPDATE restaurants 
SET latitude = 55.4242, longitude = 12.8544 
WHERE name = 'Burger House';

UPDATE restaurants 
SET latitude = 55.4252, longitude = 12.8534 
WHERE name = 'Thai Palace';

UPDATE restaurants 
SET latitude = 55.4262, longitude = 12.8524 
WHERE name = 'Wine Bar';