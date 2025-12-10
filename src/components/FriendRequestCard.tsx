import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FriendRequestCardProps {
  request: {
    id: string;
    sender_id: string;
    receiver_id: string;
    status: string;
    created_at: string;
  };
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
}

const FriendRequestCard = ({ request, onAccept, onDecline }: FriendRequestCardProps) => {
  const [senderProfile, setSenderProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSenderProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('public_profiles')
          .select('full_name, username, avatar_url')
          .eq('user_id', request.sender_id)
          .single();

        if (error) {
          console.error('Error fetching sender profile:', error);
        } else {
          setSenderProfile(data);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSenderProfile();
  }, [request.sender_id]);

  if (loading) {
    return (
      <Card className="restaurant-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 bg-muted rounded animate-pulse mb-1"></div>
              <div className="h-3 bg-muted rounded animate-pulse w-16"></div>
            </div>
            <div className="flex flex-col space-y-2">
              <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
              <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="restaurant-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-base truncate leading-tight">{senderProfile?.full_name || 'Unknown User'}</h4>
            <p className="text-sm text-muted-foreground truncate mt-0.5">@{senderProfile?.username || 'unknown'}</p>
          </div>
          <div className="flex flex-col space-y-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => onAccept(request.id)}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground h-8 w-8"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => onDecline(request.id)}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FriendRequestCard;