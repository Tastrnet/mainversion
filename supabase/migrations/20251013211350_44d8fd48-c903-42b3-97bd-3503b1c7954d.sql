-- Rename tags table to cuisines
ALTER TABLE tags RENAME TO cuisines;

-- Rename columns in cuisines table
ALTER TABLE cuisines RENAME COLUMN tag_category_1 TO cuisine_category_1;
ALTER TABLE cuisines RENAME COLUMN tag_category_2 TO cuisine_category_2;
ALTER TABLE cuisines RENAME COLUMN tag_category_3 TO cuisine_category_3;
ALTER TABLE cuisines RENAME COLUMN tag_category_4 TO cuisine_category_4;
ALTER TABLE cuisines RENAME COLUMN tag_category_5 TO cuisine_category_5;

-- Update RLS policies to reflect the new table name
DROP POLICY IF EXISTS "Admins can manage tags" ON cuisines;
DROP POLICY IF EXISTS "Tags are viewable by everyone" ON cuisines;

CREATE POLICY "Admins can manage cuisines" 
ON cuisines 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Cuisines are viewable by everyone" 
ON cuisines 
FOR SELECT 
USING (is_active = true);

-- Rename tags column to cuisines in restaurants table
ALTER TABLE restaurants RENAME COLUMN tags TO cuisines;