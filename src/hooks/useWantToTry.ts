import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/* Restaurant interface for want-to-try list - id is number to match database */
interface Restaurant {
  id: number; // Database has restaurant id as integer
  name: string;
  rating?: number;
  address?: string;
  added_at?: string;
}

export const useWantToTry = () => {
  const { toast } = useToast();

  const addToWantToTry = async (restaurant: Restaurant) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to add restaurants to your want-to-try list",
          variant: "destructive",
        });
        return false;
      }

      // Get current want-to-try list
      const { data: profile } = await supabase
        .from('profiles')
        .select('want_to_try')
        .eq('user_id', user.id)
        .single();

      const currentList = (profile?.want_to_try as unknown as Restaurant[]) || [];
      
      // Check if restaurant is already in the list
      const isAlreadyAdded = currentList.some(item => item.id === restaurant.id);
      if (isAlreadyAdded) {
        return false;
      }

      // Add restaurant to the list with timestamp
      const updatedList = [...currentList, { ...restaurant, added_at: new Date().toISOString() }];

      const { error } = await supabase
        .from('profiles')
        .update({ want_to_try: updatedList as unknown as any })
        .eq('user_id', user.id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error adding to want-to-try:', error);
      toast({
        title: "Error",
        description: "Failed to add restaurant to want-to-try list",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeFromWantToTry = async (restaurantId: number) => { // Restaurant IDs are numbers
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Get current want-to-try list
      const { data: profile } = await supabase
        .from('profiles')
        .select('want_to_try')
        .eq('user_id', user.id)
        .single();

      const currentList = (profile?.want_to_try as unknown as Restaurant[]) || [];
      
      // Remove restaurant from the list
      const updatedList = currentList.filter(restaurant => restaurant.id !== restaurantId);

      const { error } = await supabase
        .from('profiles')
        .update({ want_to_try: updatedList as unknown as any })
        .eq('user_id', user.id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error removing from want-to-try:', error);
      toast({
        title: "Error",
        description: "Failed to remove restaurant from want-to-try list",
        variant: "destructive",
      });
      return false;
    }
  };

  const checkIfInWantToTry = async (restaurantId: number): Promise<boolean> => { // Restaurant IDs are numbers
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('want_to_try')
        .eq('user_id', user.id)
        .single();

      const currentList = (profile?.want_to_try as unknown as Restaurant[]) || [];
      return currentList.some(restaurant => restaurant.id === restaurantId);
    } catch (error) {
      console.error('Error checking want-to-try status:', error);
      return false;
    }
  };

  return {
    addToWantToTry,
    removeFromWantToTry,
    checkIfInWantToTry,
  };
};