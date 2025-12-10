-- Create friend requests table for managing friend relationships
CREATE TABLE public.friend_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Enable Row Level Security
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Users can view friend requests involving them (as sender or receiver)
CREATE POLICY "Users can view their friend requests" 
ON public.friend_requests 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can create friend requests (as sender)
CREATE POLICY "Users can send friend requests" 
ON public.friend_requests 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id AND sender_id != receiver_id);

-- Users can update friend requests they received (accept/decline)
CREATE POLICY "Users can update received friend requests" 
ON public.friend_requests 
FOR UPDATE 
USING (auth.uid() = receiver_id);

-- Users can delete friend requests they sent (cancel) or accepted ones (unfriend)
CREATE POLICY "Users can delete their friend requests" 
ON public.friend_requests 
FOR DELETE 
USING (auth.uid() = sender_id OR (auth.uid() = receiver_id AND status = 'accepted'));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_friend_requests_updated_at
BEFORE UPDATE ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a view for easier friend status queries
CREATE OR REPLACE VIEW public.user_friendships AS
SELECT 
  sender_id as user_id,
  receiver_id as friend_id,
  status,
  'sent' as request_type,
  created_at,
  updated_at,
  id
FROM public.friend_requests
UNION ALL
SELECT 
  receiver_id as user_id,
  sender_id as friend_id,
  status,
  'received' as request_type,
  created_at,
  updated_at,
  id
FROM public.friend_requests;