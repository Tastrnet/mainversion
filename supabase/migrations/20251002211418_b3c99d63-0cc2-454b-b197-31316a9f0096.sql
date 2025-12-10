-- Create list_likes table for liking user-created lists
CREATE TABLE IF NOT EXISTS public.list_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, list_id)
);

-- Enable RLS
ALTER TABLE public.list_likes ENABLE ROW LEVEL SECURITY;

-- Policies for list_likes
CREATE POLICY "Users can like lists"
ON public.list_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike lists"
ON public.list_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "List likes are viewable by everyone"
ON public.list_likes
FOR SELECT
TO authenticated
USING (true);

-- Create activity_type enum
CREATE TYPE public.activity_type AS ENUM ('review_created', 'list_created', 'list_liked');

-- Create activities table for activity feed
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  related_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Policies for activities
CREATE POLICY "Users can view activities of people they follow"
ON public.activities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.followers
    WHERE follower_id = auth.uid()
    AND following_id = activities.user_id
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Users can create their own activities"
ON public.activities
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_list_likes_user_id ON public.list_likes(user_id);
CREATE INDEX idx_list_likes_list_id ON public.list_likes(list_id);
CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);

-- Add notification and privacy preferences columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_activity BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_friend_requests BOOLEAN DEFAULT true;