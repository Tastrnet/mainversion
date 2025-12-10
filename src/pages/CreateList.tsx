import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";
import HeaderBanner from "@/components/HeaderBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CreateList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  
  const restaurantId = searchParams.get('restaurantId');
  const restaurantName = searchParams.get('restaurantName');
  
  const [listData, setListData] = useState({
    name: "",
    description: "",
    visibility: "public",
    isRanked: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listData.name.trim() || !user) return;

    setLoading(true);

    try {
      /* Create list in database */
      const { data: newList, error } = await supabase
        .from('lists')
        .insert({
          name: listData.name.trim(),
          description: listData.description.trim() || null,
          is_public: listData.visibility === "public",
          is_ranked: listData.isRanked,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating list:', error);
        return;
      }

      if (newList) {
        // Create activity for creating list
        await supabase
          .from('activities')
          .insert({
            user_id: user.id,
            activity_type: 'list_created',
            related_id: newList.id
          });

        // If restaurant was passed, add it to the list
        if (restaurantId) {
          const { error: addError } = await supabase
            .from('list_restaurants')
            .insert([{
              list_id: newList.id,
              restaurant_id: Number(restaurantId),
              position: 0
            }]);

          if (addError) {
            console.error('Error adding restaurant to list:', addError);
          }
        }
        
        navigate(`/list/${newList.id}`);
      }
    } catch (error) {
      console.error('Error creating list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setListData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />
      
      {/* Content with top padding for fixed banner */}
      <div className="safe-area-content">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center justify-center">
            <Button 
              onClick={() => navigate("/lists")}
              variant="ghost" 
              size="icon"
              className="rounded-full absolute left-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-medium">Create List</h1>
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

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            type="submit"
            className="btn-primary w-full"
            disabled={!listData.name.trim() || loading}
          >
            {loading ? "Creating..." : "Create List"}
          </Button>
          
          <Button 
            type="button"
            onClick={() => navigate("/lists")}
            variant="outline"
            className="btn-secondary w-full"
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
        </form>
      </div>
    </div>
  );
};

export default CreateList;