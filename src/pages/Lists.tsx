import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Lock, Bookmark, ArrowLeft, Heart } from "lucide-react";
import MobileNavigation from "@/components/MobileNavigation";
import HeaderBanner from "@/components/HeaderBanner";
import { FilterOptions } from "@/components/FilterButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/* Liked Lists Section Component */
const LikedListsSection = ({ 
  userId, 
  filters, 
  onFiltersChange 
}: { 
  userId?: string; 
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}) => {
  const navigate = useNavigate();
  const [likedLists, setLikedLists] = useState<any[]>([]);
  const [unfilteredLikedListsCount, setUnfilteredLikedListsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLikedLists = async () => {
      setLoading(true);
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch list IDs that user has liked
        const { data: likes } = await supabase
          .from('list_likes')
          .select('list_id')
          .eq('user_id', userId);

        if (!likes || likes.length === 0) {
          setUnfilteredLikedListsCount(0);
          setLoading(false);
          return;
        }

        const likedListIds = likes.map(like => like.list_id);

        // Get total count without filters
        const { count: totalCount } = await supabase
          .from('lists')
          .select('id', { count: 'exact', head: true })
          .in('id', likedListIds)
          .eq('is_public', true);

        setUnfilteredLikedListsCount(totalCount || 0);

        // Fetch the actual lists with filters applied
        let query = supabase
          .from('lists')
          .select('id, name, description, is_public, is_ranked, user_id, created_at, updated_at')
          .in('id', likedListIds)
          .eq('is_public', true); // Only show public liked lists

        // Apply ranked filter
        if (filters.ranked !== 'any') {
          query = query.eq('is_ranked', filters.ranked === 'ranked');
        }

        // Apply sorting
        switch (filters.sortBy) {
          case 'latest_updated':
            query = query.order('updated_at', { ascending: false });
            break;
          case 'name':
            query = query.order('name', { ascending: true });
            break;
          case 'popularity':
            query = query.order('created_at', { ascending: false });
            break;
          default:
            query = query.order('updated_at', { ascending: false });
        }

        const { data: lists } = await query;

        if (lists && lists.length > 0) {
          // For each list, fetch restaurant count and likes count
          const listsWithCounts = await Promise.all(
            lists.map(async (list) => {
              const { count: restaurantCount } = await supabase
                .from('list_restaurants')
                .select('*', { count: 'exact', head: true })
                .eq('list_id', list.id);

              const { count: likesCount } = await supabase
                .from('list_likes')
                .select('*', { count: 'exact', head: true })
                .eq('list_id', list.id);

              return {
                ...list,
                count: restaurantCount || 0,
                likes: likesCount || 0,
                type: list.is_public ? 'public' : 'private'
              };
            })
          );

          setLikedLists(listsWithCounts);
        } else {
          setLikedLists([]);
        }
      } catch (error) {
        console.error('Error fetching liked lists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLikedLists();
  }, [userId, filters]);

  // Don't show section if no liked lists at all
  if (unfilteredLikedListsCount === 0 && !loading) {
    return null;
  }

  if (loading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Liked Lists</h2>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} className="restaurant-card">
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                  <div className="h-3 bg-muted rounded mb-2 w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Liked Lists</h2>
      </div>
      {likedLists.length > 0 ? (
        <div className="space-y-3">
          {likedLists.map((list) => (
            <Card 
              key={list.id} 
              className="restaurant-card cursor-pointer"
              onClick={() => navigate(`/list/${list.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <h3 className="font-medium mr-2">{list.name}</h3>
                    </div>
                    {list.description && (
                      <p className="text-sm text-muted-foreground mb-2">{list.description}</p>
                    )}
                    <div className="flex items-center text-xs text-muted-foreground gap-3">
                      <span>{list.count} restaurants</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No lists match your filters</p>
          </CardContent>
        </Card>
      )}
    </section>
  );
};

const Lists = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  
  // Determine if viewing own lists or someone else's
  const isOwnProfile = !id || id === user?.id;
  const profileUserId = id || user?.id;
  
  const [lists, setLists] = useState<any[]>([]);
  const [unfilteredListsCount, setUnfilteredListsCount] = useState(0); // Track original count
  const [loading, setLoading] = useState(true);
  const [myListsFilters, setMyListsFilters] = useState<FilterOptions>({
    sortBy: 'latest_updated',
    visibility: 'any',
    ranked: 'any'
  });
  const [likedListsFilters, setLikedListsFilters] = useState<FilterOptions>({
    sortBy: 'latest_updated',
    visibility: 'any',
    ranked: 'any'
  });

  /* Fetch user lists from database */
  useEffect(() => {
    const fetchUserLists = async () => {
      try {
        if (!profileUserId) {
          setLoading(false);
          return;
        }

        // First, get total count without filters for tracking
        let countQuery = supabase
          .from('lists')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profileUserId);
        
        if (!isOwnProfile) {
          countQuery = countQuery.eq('is_public', true);
        }

        const { count: totalCount } = await countQuery;
        setUnfilteredListsCount(totalCount || 0);

        // Build filtered query
        let query = supabase
          .from('lists')
          .select('id, name, description, is_public, is_ranked, created_at, updated_at')
          .eq('user_id', profileUserId);
        
        // If viewing someone else's profile, only show public lists
        if (!isOwnProfile) {
          query = query.eq('is_public', true);
        }

        // Apply visibility filter
        if (myListsFilters.visibility !== 'any') {
          query = query.eq('is_public', myListsFilters.visibility === 'public');
        }

        // Apply ranked filter
        if (myListsFilters.ranked !== 'any') {
          query = query.eq('is_ranked', myListsFilters.ranked === 'ranked');
        }

        // Apply sorting
        switch (myListsFilters.sortBy) {
          case 'latest_updated':
            query = query.order('updated_at', { ascending: false });
            break;
          case 'name':
            query = query.order('name', { ascending: true });
            break;
          case 'popularity':
            // For now, order by created_at since likes system isn't implemented yet
            query = query.order('created_at', { ascending: false });
            break;
          default:
            query = query.order('updated_at', { ascending: false });
        }

        const { data: userLists, error: listsError } = await query;

        if (listsError) {
          console.error('Error fetching lists:', listsError);
          setLoading(false);
          return;
        }

        if (userLists) {
          // For each list, fetch the restaurant count
          const listsWithCounts = await Promise.all(
            userLists.map(async (list) => {
              const { count } = await supabase
                .from('list_restaurants')
                .select('*', { count: 'exact', head: true })
                .eq('list_id', list.id);

              return {
                ...list,
                count: count || 0,
                type: list.is_public ? 'public' : 'private'
              };
            })
          );

          setLists(listsWithCounts);
        }
      } catch (error) {
        console.error('Error fetching user lists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserLists();
  }, [myListsFilters, profileUserId, isOwnProfile]);


  const getVisibilityIcon = (type: string) => {
    switch (type) {
      case "private": return <Lock className="h-4 w-4 text-muted-foreground" />;
      default: return null;
    }
  };

  const getVisibilityText = (type: string) => {
    switch (type) {
      case "private": return "Private";
      case "friends": return "Friends";
      case "public": return "Public";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />
      
      {/* Content with top padding for fixed banner */}
      <div className="safe-area-content">
        {/* Page Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center justify-center">
            <Button 
              onClick={() => navigate(isOwnProfile ? "/profile" : `/profile/${profileUserId}`)}
              variant="ghost" 
              size="icon"
              className="rounded-full absolute left-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-medium">Lists</h1>
          </div>
        </div>

      <div className="p-4 space-y-6">
        {/* Want to Try List - Special (only show for own profile) */}
        {isOwnProfile && (
          <Card 
            className="restaurant-card cursor-pointer border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5"
            onClick={() => navigate("/want-to-try")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Bookmark className="h-5 w-5 text-primary mr-3" />
                  <div>
                    <h3 className="font-medium">Want to Try</h3>
                    <p className="text-sm text-muted-foreground">Restaurants you want to visit</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Lists */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">{isOwnProfile ? 'My Lists' : 'Lists'}</h2>
            {isOwnProfile && (
              <Button 
                onClick={() => navigate("/create-list")}
                className="rounded-full"
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="restaurant-card">
                  <CardContent className="p-4">
                    <div className="animate-pulse">
                      <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                      <div className="h-3 bg-muted rounded mb-2 w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-1/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : lists.length > 0 ? (
            <div className="space-y-3">
              {lists.map((list) => (
                <Card 
                  key={list.id} 
                  className="restaurant-card cursor-pointer"
                  onClick={() => navigate(`/list/${list.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <h3 className="font-medium mr-2">{list.name}</h3>
                          {getVisibilityIcon(list.type)}
                        </div>
                        {list.description && (
                          <p className="text-sm text-muted-foreground mb-2">{list.description}</p>
                        )}
                        <div className="flex items-center text-xs text-muted-foreground">
                          <span>{list.count} restaurants</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : unfilteredListsCount > 0 ? (
            // Has lists but filtered to 0 results
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No lists match your filters</p>
              </CardContent>
            </Card>
          ) : (
            // No lists at all
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-1">
                  {isOwnProfile ? "No lists yet" : "No public lists"}
                </p>
                {isOwnProfile && (
                  <p className="text-sm text-muted-foreground">Create your first list to organize restaurants</p>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Liked Lists - show for own profile */}
        {isOwnProfile && (
          <LikedListsSection 
            userId={user?.id} 
            filters={likedListsFilters}
            onFiltersChange={setLikedListsFilters}
          />
        )}

      </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default Lists;