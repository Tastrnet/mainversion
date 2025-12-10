-- Make overall rating optional by allowing null values
ALTER TABLE reviews 
ALTER COLUMN rating DROP NOT NULL;