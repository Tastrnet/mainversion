import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, X, Star, Check } from "lucide-react";
import HeaderBanner from "@/components/HeaderBanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EditList = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [listData, setListData] = useState({
    name: "",
    description: "",
    visibility: "public",
    isRanked: false
  });

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [notesTimeout, setNotesTimeout] = useState<any>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingPosition, setEditingPosition] = useState<string | null>(null);
  const [tempPosition, setTempPosition] = useState("");

  /* Fetch list data from database */
  useEffect(() => {
    const fetchList = async () => {
      if (!id) {
        navigate("/lists");
        return;
      }

      try {
        const { data, error } = await supabase
          .from('lists')
          .select('name, description, is_public, is_ranked, user_id')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching list:', error);
          toast.error("List not found");
          navigate("/lists");
          return;
        }

        // Check if user owns this list
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id !== data.user_id) {
          toast.error("You can only edit your own lists");
          navigate(`/list/${id}`);
          return;
        }

        setListData({
          name: data.name,
          description: data.description || "",
          visibility: data.is_public ? "public" : "private",
          isRanked: data.is_ranked
        });

        /* Fetch list restaurants */
        const { data: listRestaurants, error: restaurantsError } = await supabase
          .from('list_restaurants')
          .select('restaurant_id, position, notes')
          .eq('list_id', id)
          .order('position', { ascending: true });

        if (restaurantsError) {
          console.error('Error fetching list restaurants:', restaurantsError);
        } else if (listRestaurants && listRestaurants.length > 0) {
          const restaurantIds = listRestaurants.map(lr => lr.restaurant_id);
          const { data: restaurantDetails } = await supabase
            .from('restaurants')
            .select('id, name, address')
            .in('id', restaurantIds);

          /* Fetch user's ratings */
          const { data: reviewsData } = await supabase
            .from('reviews')
            .select('restaurant_id, rating')
            .eq('user_id', user.id)
            .in('restaurant_id', restaurantIds)
            .order('created_at', { ascending: false });

          const restaurantMap = new Map(restaurantDetails?.map(r => [r.id, r]) || []);
          const ratingMap = new Map();
          reviewsData?.forEach(review => {
            if (!ratingMap.has(review.restaurant_id)) {
              ratingMap.set(review.restaurant_id, review.rating);
            }
          });

          setRestaurants(listRestaurants.map(lr => {
            const restaurant = restaurantMap.get(lr.restaurant_id);
            return {
              id: lr.restaurant_id,
              name: restaurant?.name || 'Unknown Restaurant',
              address: restaurant?.address || '',
              rating: ratingMap.get(lr.restaurant_id) || null,
              position: lr.position,
              notes: lr.notes || ''
            };
          }));
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error("Failed to load list");
        navigate("/lists");
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [id, navigate]);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!listData.name.trim()) {
      toast.error("Please enter a list name");
      return;
    }

    setSaving(true);

    try {
      /* Update list in database */
      const { error } = await supabase
        .from('lists')
        .update({
          name: listData.name.trim(),
          description: listData.description.trim() || null,
          is_public: listData.visibility === "public",
          is_ranked: listData.isRanked,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating list:', error);
        toast.error("Failed to save changes. Please try again.");
        return;
      }

      toast.success("List updated successfully!");
      navigate(`/list/${id}`);
    } catch (error) {
      console.error('Error updating list:', error);
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setListData(prev => ({ ...prev, [field]: value }));
  };

  /* Update restaurant notes with debounce - restaurantId is number to match database */
  const handleNotesChange = useCallback((restaurantId: number, notes: string) => {
    // Update local state immediately
    setRestaurants(prev => prev.map(r => 
      r.id === restaurantId ? { ...r, notes } : r
    ));

    // Clear existing timeout
    if (notesTimeout) {
      clearTimeout(notesTimeout);
    }

    // Set new timeout to save
    const timeout = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('list_restaurants')
          .update({ notes: notes || null })
          .eq('list_id', id)
          .eq('restaurant_id', restaurantId);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating notes:', error);
        toast.error("Failed to save notes");
      }
    }, 500);

    setNotesTimeout(timeout);
  }, [id, notesTimeout]);

  /* Remove restaurant from list - restaurantId is number to match database */
  const handleRemoveRestaurant = async (restaurantId: number) => {
    try {
      const { error } = await supabase
        .from('list_restaurants')
        .delete()
        .eq('list_id', id)
        .eq('restaurant_id', restaurantId);

      if (error) throw error;

      setRestaurants(prev => prev.filter(r => r.id !== restaurantId));
      toast.success("Restaurant removed from list");
    } catch (error) {
      console.error('Error removing restaurant:', error);
      toast.error("Failed to remove restaurant");
    }
  };

  /* Move restaurant up */
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newRestaurants = [...restaurants];
    const temp = newRestaurants[index];
    newRestaurants[index] = newRestaurants[index - 1];
    newRestaurants[index - 1] = temp;

    // Update positions
    newRestaurants.forEach((r, i) => r.position = i);
    setRestaurants(newRestaurants);

    // Save to database
    try {
      await Promise.all([
        supabase.from('list_restaurants')
          .update({ position: index - 1 })
          .eq('list_id', id)
          .eq('restaurant_id', temp.id),
        supabase.from('list_restaurants')
          .update({ position: index })
          .eq('list_id', id)
          .eq('restaurant_id', newRestaurants[index].id)
      ]);
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error("Failed to reorder");
    }
  };

  /* Move restaurant down */
  const handleMoveDown = async (index: number) => {
    if (index === restaurants.length - 1) return;

    const newRestaurants = [...restaurants];
    const temp = newRestaurants[index];
    newRestaurants[index] = newRestaurants[index + 1];
    newRestaurants[index + 1] = temp;

    // Update positions
    newRestaurants.forEach((r, i) => r.position = i);
    setRestaurants(newRestaurants);

    // Save to database
    try {
      await Promise.all([
        supabase.from('list_restaurants')
          .update({ position: index + 1 })
          .eq('list_id', id)
          .eq('restaurant_id', temp.id),
        supabase.from('list_restaurants')
          .update({ position: index })
          .eq('list_id', id)
          .eq('restaurant_id', newRestaurants[index].id)
      ]);
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error("Failed to reorder");
    }
  };

  /* Drag and drop handlers */
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newRestaurants = [...restaurants];
    const [draggedItem] = newRestaurants.splice(draggedIndex, 1);
    newRestaurants.splice(dropIndex, 0, draggedItem);

    // Update positions
    newRestaurants.forEach((r, i) => r.position = i);
    setRestaurants(newRestaurants);

    // Save all positions to database
    try {
      await Promise.all(
        newRestaurants.map((restaurant, idx) =>
          supabase
            .from('list_restaurants')
            .update({ position: idx })
            .eq('list_id', id)
            .eq('restaurant_id', restaurant.id)
        )
      );
    } catch (error) {
      console.error('Error saving new order:', error);
      toast.error("Failed to save new order");
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  /* Edit position by clicking number */
  const handlePositionClick = (restaurantId: string, currentPosition: number) => {
    setEditingPosition(restaurantId);
    setTempPosition(String(currentPosition + 1));
  };

  const handlePositionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setTempPosition(value);
    }
  };

  const handlePositionSubmit = async (restaurantId: string) => {
    if (!tempPosition) {
      setEditingPosition(null);
      return;
    }

    const newPosition = parseInt(tempPosition) - 1;
    if (newPosition < 0 || newPosition >= restaurants.length) {
      toast.error(`Position must be between 1 and ${restaurants.length}`);
      setEditingPosition(null);
      return;
    }

    const currentIndex = restaurants.findIndex(r => r.id === restaurantId);
    if (currentIndex === -1 || currentIndex === newPosition) {
      setEditingPosition(null);
      return;
    }

    const newRestaurants = [...restaurants];
    const [movedItem] = newRestaurants.splice(currentIndex, 1);
    newRestaurants.splice(newPosition, 0, movedItem);

    // Update positions
    newRestaurants.forEach((r, i) => r.position = i);
    setRestaurants(newRestaurants);

    // Save all positions to database
    try {
      await Promise.all(
        newRestaurants.map((restaurant, idx) =>
          supabase
            .from('list_restaurants')
            .update({ position: idx })
            .eq('list_id', id)
            .eq('restaurant_id', restaurant.id)
        )
      );
    } catch (error) {
      console.error('Error saving new order:', error);
      toast.error("Failed to save new order");
    }

    setEditingPosition(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <HeaderBanner />
        <div className="safe-area-content">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center justify-center">
            <Button 
              onClick={() => navigate(`/list/${id}`)}
              variant="ghost" 
              size="icon"
              className="rounded-full absolute left-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-medium">Edit List</h1>
            <Button 
              onClick={handleSubmit}
              variant="ghost" 
              size="icon"
              className="rounded-full absolute right-4"
              disabled={!listData.name.trim() || saving}
            >
              <Check className="h-5 w-5" />
            </Button>
          </div>
        </div>
          <div className="p-4">
            <Card className="restaurant-card">
              <CardContent className="p-4">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-10 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-24 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />
      
      {/* Content with top padding for fixed banner */}
      <div className="safe-area-content">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center justify-center">
            <Button 
              onClick={() => navigate(`/list/${id}`)}
              variant="ghost" 
              size="icon"
              className="rounded-full absolute left-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-medium">Edit List</h1>
            <Button 
              onClick={handleSubmit}
              variant="ghost" 
              size="icon"
              className="rounded-full absolute right-4"
              disabled={!listData.name.trim() || saving}
            >
              <Check className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* List Details */}
        <Card className="restaurant-card">
          <CardContent className="p-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">List Name *</Label>
              <Input
                id="name"
                value={listData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={listData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>

            {/* Privacy Settings */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">
                  {listData.visibility === "public" ? "Public" : "Private"}
                </Label>
              </div>
              <Switch
                checked={listData.visibility === "public"}
                onCheckedChange={(checked) => handleInputChange("visibility", checked ? "public" : "private")}
              />
            </div>

            {/* List Type */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">
                  {listData.isRanked ? "Ranked" : "Not Ranked"}
                </Label>
              </div>
              <Switch
                checked={listData.isRanked}
                onCheckedChange={(checked) => handleInputChange("isRanked", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Restaurants List */}
        {restaurants.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">Restaurants ({restaurants.length})</h3>
            {restaurants.map((restaurant, index) => (
              <Card 
                key={restaurant.id} 
                className={`restaurant-card transition-all duration-200 ${
                  draggedIndex === index ? 'opacity-50 scale-95' : ''
                } ${
                  dragOverIndex === index ? 'border-primary border-2' : ''
                }`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-2">
                      {editingPosition === restaurant.id ? (
                        <Input
                          type="text"
                          value={tempPosition}
                          onChange={handlePositionChange}
                          onBlur={() => handlePositionSubmit(restaurant.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handlePositionSubmit(restaurant.id);
                            if (e.key === 'Escape') setEditingPosition(null);
                          }}
                          className="w-12 h-8 text-center text-xs p-1"
                          autoFocus
                        />
                      ) : (
                        <div 
                          className="bg-primary text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => handlePositionClick(restaurant.id, index)}
                        >
                          {index + 1}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground">{restaurant.name}</h4>
                      {restaurant.address && (
                        <p className="text-sm text-muted-foreground">{restaurant.address}</p>
                      )}
                      {restaurant.rating && (
                        <div className="flex items-center mt-1">
                          <Star className="h-3 w-3 mr-1 fill-current text-primary" />
                          <span className="text-sm text-muted-foreground">
                            {Number(restaurant.rating).toFixed(1)}
                          </span>
                        </div>
                      )}
                      <Textarea
                        value={restaurant.notes}
                        onChange={(e) => handleNotesChange(restaurant.id, e.target.value)}
                        className="mt-3 min-h-[60px] text-sm"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveRestaurant(restaurant.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </form>
      </div>
    </div>
  );
};

export default EditList;