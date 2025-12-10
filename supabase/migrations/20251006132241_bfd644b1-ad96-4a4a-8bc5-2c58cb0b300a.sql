-- Enable realtime for followers table
ALTER TABLE public.followers REPLICA IDENTITY FULL;

-- Add followers table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.followers;