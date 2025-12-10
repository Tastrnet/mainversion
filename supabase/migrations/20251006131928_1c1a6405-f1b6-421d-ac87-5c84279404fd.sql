-- Allow users to view public profile information of other users
-- This enables the public_profiles view to work for searches
CREATE POLICY "Users can view public profile data of others"
ON profiles
FOR SELECT
TO authenticated
USING (true);