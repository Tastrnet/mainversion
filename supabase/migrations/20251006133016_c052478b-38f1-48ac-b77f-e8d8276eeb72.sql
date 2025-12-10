-- Enable realtime for list_likes table
ALTER TABLE public.list_likes REPLICA IDENTITY FULL;

-- Add list_likes table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.list_likes;