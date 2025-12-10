-- Add photos column to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb;

-- Create storage bucket for review photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-photos', 'review-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to ensure clean slate)
DROP POLICY IF EXISTS "Review photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own review photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own review photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own review photos" ON storage.objects;

-- Create RLS policies for review photos bucket

/* Users can view all review photos */
CREATE POLICY "Review photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'review-photos');

/* Users can upload photos to their own review folder */
CREATE POLICY "Users can upload their own review photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'review-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

/* Users can update their own review photos */
CREATE POLICY "Users can update their own review photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'review-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

/* Users can delete their own review photos */
CREATE POLICY "Users can delete their own review photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'review-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);