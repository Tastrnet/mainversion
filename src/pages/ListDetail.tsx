import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Edit, Share, Heart, Star, Plus, User, Trash, Lock, MoreVertical, Flag, Trash2, Users } from "lucide-react";
import MobileNavigation from "@/components/MobileNavigation";
import HeaderBanner from "@/components/HeaderBanner";
import { supabase } from "@/integrations/supabase/client";
import ReportDialog from "@/components/ReportDialog";
import RestaurantFilterButton, { RestaurantFilterOptions } from "@/components/RestaurantFilterButton";
import { normalizeCuisines } from "@/lib/cuisine-utils";

const ListDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [list, setList] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLikesDialog, setShowLikesDialog] = useState(false);
  const [likedByUsers, setLikedByUsers] = useState<any[]>([]);
  const [filters, setFilters] = useState<RestaurantFilterOptions>({
    sortBy: 'list_order',
    cuisines: 'Any',
    ratingRange: [0, 5]
  });
  const [allRestaurants, setAllRestaurants] = useState<any[]>([]);
  const [unfilteredRestaurantsCount, setUnfilteredRestaurantsCount] = useState(0);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [cuisinePaths, setCuisinePaths] = useState<Array<{ name: string; path: string[] }>>([]);
  const [availableCuisines, setAvailableCuisines] = useState<Set<string>>(new Set());

  // Load cuisine metadata for hierarchical filtering
  useEffect(() => {
    const loadCuisineMetadata = async () => {
      if (cuisinePaths.length > 0) return;
      try {
        const { data } = await supabase
          .from("cuisines")
          .select("*")
          .eq("is_active", true)
          .order(
            "cuisine_category_1, cuisine_category_2, cuisine_category_3, cuisine_category_4, cuisine_category_5, name"
          );
        
        if (data) {
          const paths = data.map((cuisine) => {
            const path: string[] = [];
            for (let level = 1; level <= 5; level++) {
              const value = cuisine[`cuisine_category_${level}`];
              if (value) {
                path.push(value);
              }
            }
            if (!path.includes(cuisine.name)) {
              path.push(cuisine.name);
            }
            return { name: cuisine.name, path };
          });
          setCuisinePaths(paths);
        }
      } catch (metaError) {
        console.error("Failed to load cuisine metadata:", metaError);
      }
    };
    loadCuisineMetadata();
  }, [cuisinePaths.length]);

  // Extract available cuisines from all restaurants in the list (including parent categories)
  useEffect(() => {
    if (!allRestaurants.length || !cuisinePaths.length) {
      setAvailableCuisines(new Set());
      return;
    }

    // Extract all unique cuisines from restaurants in the list
    const cuisineSet = new Set<string>();
    allRestaurants.forEach((restaurant) => {
      if (restaurant.cuisines && Array.isArray(restaurant.cuisines)) {
        restaurant.cuisines.forEach((cuisine: string) => {
          if (cuisine && typeof cuisine === 'string') {
            const trimmed = cuisine.trim();
            if (trimmed) {
              cuisineSet.add(trimmed);
            }
          }
        });
      }
    });

    // Add parent categories for each cuisine found
    const finalCuisineSet = new Set<string>(cuisineSet);
    cuisinePaths.forEach(({ name, path }) => {
      if (cuisineSet.has(name)) {
        // If this cuisine is in the list, add all its parent categories
        path.forEach((category) => {
          finalCuisineSet.add(category);
        });
      }
    });

    setAvailableCuisines(finalCuisineSet);
  }, [allRestaurants, cuisinePaths]);

  useEffect(() => {
    const fetchListData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        if (!id) {
          setLoading(false);
          return;
        }

        // Fetch the list details
        const { data: listData, error: listError } = await supabase
          .from('lists')
          .select('id, name, description, user_id, is_public, is_ranked, created_at')
          .eq('id', id)
          .single();

        if (listError) {
          console.error('Error fetching list:', listError);
          setLoading(false);
          return;
        }

        // Fetch the list owner's profile
        const { data: profileData, error: profileError } = await supabase
          .from('public_profiles')
          .select('user_id, username, full_name, avatar_url')
          .eq('user_id', listData.user_id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setLoading(false);
          return;
        }

        // Check if current user has liked this list
        if (user) {
          const { data: likeData } = await supabase
            .from('list_likes')
            .select('id')
            .eq('list_id', id)
            .eq('user_id', user.id)
            .maybeSingle();
          
          setLiked(!!likeData);
        }

        // Count total likes for this list
        const { count: likesCount } = await supabase
          .from('list_likes')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', id);

        // Fetch restaurants in the list
        const { data: listRestaurants, error: restaurantsError } = await supabase
          .from('list_restaurants')
          .select('restaurant_id, position, notes')
          .eq('list_id', id)
          .order('position', { ascending: true });

        if (restaurantsError) {
          console.error('Error fetching list restaurants:', restaurantsError);
          setLoading(false);
          return;
        }

        // Fetch restaurant details
        let restaurants = [];
        if (listRestaurants && listRestaurants.length > 0) {
          const restaurantIds = listRestaurants.map(lr => lr.restaurant_id);
          const { data: restaurantDetails, error: detailsError} = await supabase
            .from('restaurants')
            .select('id, name, address, cuisines, latitude, longitude')
            .in('id', restaurantIds);

          // Fetch user's reviews for these restaurants to get their ratings
          let userReviews = [];
          if (user) {
            const { data: reviewsData, error: reviewsError } = await supabase
              .from('reviews')
              .select('restaurant_id, rating, created_at')
              .eq('user_id', user.id)
              .in('restaurant_id', restaurantIds)
              .order('created_at', { ascending: false });
            
            if (!reviewsError && reviewsData) {
              userReviews = reviewsData;
            }
          }

          if (!detailsError && restaurantDetails) {
            // Create map of restaurant details
            const restaurantMap = new Map(restaurantDetails.map(r => [r.id, r]));
            
            // Create map of user's latest ratings
            const userRatingMap = new Map();
            userReviews.forEach(review => {
              if (!userRatingMap.has(review.restaurant_id)) {
                userRatingMap.set(review.restaurant_id, review.rating);
              }
            });
            
            restaurants = listRestaurants.map((lr, index) => {
              const restaurant = restaurantMap.get(lr.restaurant_id);
              const userRating = userRatingMap.get(lr.restaurant_id);
              return {
                id: lr.restaurant_id,
                name: restaurant?.name || 'Unknown Restaurant',
                address: restaurant?.address || '',
                cuisines: normalizeCuisines(restaurant?.cuisines || []),
                latitude: restaurant?.latitude || null,
                longitude: restaurant?.longitude || null,
                rank: listData.is_ranked ? lr.position + 1 : null,
                rating: userRating || null,
                notes: lr.notes || null,
                originalPosition: lr.position
              };
            });
          }
        }

        const fullList = {
          id: listData.id,
          name: listData.name,
          description: listData.description,
          author: {
            user_id: profileData.user_id,
            name: profileData.full_name,
            username: profileData.username,
            avatar_url: profileData.avatar_url,
            isOwner: user?.id === listData.user_id
          },
          visibility: listData.is_public ? 'public' : 'private',
          is_public: listData.is_public,
          isRanked: listData.is_ranked,
          likes: likesCount || 0,
          restaurants
        };

        setList(fullList);
        setAllRestaurants(restaurants);
        setUnfilteredRestaurantsCount(restaurants.length);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchListData();
  }, [id]);

  // Get user location for distance sorting
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied or failed:', error);
        }
      );
    }
  }, []);

  /* Apply filters to restaurants */
  useEffect(() => {
    const applyFilters = async () => {
      if (!list || !allRestaurants.length) return;

      let filtered = [...allRestaurants];

      /* Filter by cuisines with hierarchical matching (same as Nearby Restaurants page) */
      if (filters.cuisines !== 'Any' && cuisinePaths.length > 0) {
        // Get matching cuisine names using hierarchical path matching
        // Only include the selected cuisine and its descendants (children), not ancestors (parents)
        const normalizedSelection = filters.cuisines.trim();
        const matchingNames = new Set<string>();
        
        cuisinePaths.forEach(({ path }) => {
          // Find the index of the selected cuisine in the path
          const selectionIndex = path.findIndex(value => value === normalizedSelection);
          
          if (selectionIndex !== -1) {
            // Only include the selected cuisine and its descendants (everything after it in the path)
            // This ensures that selecting "South Asian" only matches "South Asian" and "Indian", not "Asian"
            for (let i = selectionIndex; i < path.length; i++) {
              matchingNames.add(path[i]);
            }
          }
        });
        
        if (matchingNames.size > 0) {
          filtered = filtered.filter(restaurant => {
            if (!restaurant.cuisines || !Array.isArray(restaurant.cuisines) || restaurant.cuisines.length === 0) {
              return false;
            }
            
            // Check if restaurant has any cuisine that matches
            return restaurant.cuisines.some((cuisine: string) => 
              matchingNames.has(cuisine)
            );
          });
        } else {
          // No matches found, filter out all restaurants
          filtered = [];
        }
      }

      // Filter by distance
      if (filters.distance && userLocation) {
        filtered = filtered.filter(restaurant => {
          if (!restaurant.latitude || !restaurant.longitude) return false;
          
          const distance = calculateDistance(
            userLocation,
            { lat: Number(restaurant.latitude), lng: Number(restaurant.longitude) }
          );
          
          return distance <= filters.distance!;
        });
      }

      // Sort restaurants
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'list_order':
            return (a.originalPosition || 0) - (b.originalPosition || 0);
          case 'distance':
            if (!userLocation) return 0;
            const distA = a.latitude && a.longitude ? 
              calculateDistance(userLocation, { lat: Number(a.latitude), lng: Number(a.longitude) }) : 
              Infinity;
            const distB = b.latitude && b.longitude ? 
              calculateDistance(userLocation, { lat: Number(b.latitude), lng: Number(b.longitude) }) : 
              Infinity;
            return distA - distB;
          case 'rating':
            const ratingA = a.rating || 0;
            const ratingB = b.rating || 0;
            return ratingB - ratingA;
          case 'name':
            return a.name.localeCompare(b.name);
          case 'price':
            const priceA = a.price_level || 0;
            const priceB = b.price_level || 0;
            return priceA - priceB;
          default:
            return (a.originalPosition || 0) - (b.originalPosition || 0);
        }
      });

      // Update rank based on current position in filtered/sorted list
      // For ranked lists, always show the position in the current filtered/sorted list
      const updatedRestaurants = filtered.map((restaurant, index) => {
        if (list?.isRanked) {
          // Always use current position in filtered/sorted list (1-based)
          return { ...restaurant, rank: index + 1 };
        }
        return restaurant;
      });

      setList(prev => prev ? { ...prev, restaurants: updatedRestaurants } : prev);
    };

    applyFilters();
  }, [filters, allRestaurants, list?.id, userLocation, cuisinePaths]);

  const calculateDistance = (point1: {lat: number, lng: number}, point2: {lat: number, lng: number}) => {
    const R = 6371;
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  /* Real-time like count updates */
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel('list-likes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'list_likes',
          filter: `list_id=eq.${id}`
        },
        async () => {
          // Refetch like count when likes change
          const { count: likesCount } = await supabase
            .from('list_likes')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', id);

          setList((prev: any) => prev ? { ...prev, likes: likesCount || 0 } : prev);

          // Check if current user has liked
          if (currentUser) {
            const { data: likeData } = await supabase
              .from('list_likes')
              .select('id')
              .eq('list_id', id)
              .eq('user_id', currentUser.id)
              .maybeSingle();
            
            setLiked(!!likeData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, currentUser]);

  const handleLike = async () => {
    if (!currentUser || !id) return;

    // If it's the owner's list, show who liked it (if there are likes)
    if (list?.author?.isOwner) {
      if (list.likes > 0) {
        setShowLikesDialog(true);
        // Fetch users who liked this list
        const { data: likes } = await supabase
          .from('list_likes')
          .select('user_id, created_at')
          .eq('list_id', id)
          .order('created_at', { ascending: false });

        if (likes && likes.length > 0) {
          const userIds = likes.map(like => like.user_id);
          const { data: profiles } = await supabase
            .from('public_profiles')
            .select('user_id, username, full_name, avatar_url')
            .in('user_id', userIds);

          if (profiles) {
            // Map profiles with like timestamps
            const usersWithLikes = likes.map(like => {
              const profile = profiles.find(p => p.user_id === like.user_id);
              return {
                ...profile,
                liked_at: like.created_at
              };
            });
            setLikedByUsers(usersWithLikes);
          }
        }
      }
      return; // Don't allow owner to like their own list
    }

    // Allow non-owners to like/unlike
    try {
      if (liked) {
        // Unlike the list
        await supabase
          .from('list_likes')
          .delete()
          .eq('list_id', id)
          .eq('user_id', currentUser.id);
        
        setLiked(false);
        setList((prev: any) => prev ? { ...prev, likes: Math.max(0, prev.likes - 1) } : prev);
      } else {
        // Like the list
        await supabase
          .from('list_likes')
          .insert({
            list_id: id,
            user_id: currentUser.id
          });

        // Create activity for liking
        await supabase
          .from('activities')
          .insert({
            user_id: currentUser.id,
            activity_type: 'list_liked',
            related_id: id
          });
        
        setLiked(true);
        setList((prev: any) => prev ? { ...prev, likes: prev.likes + 1 } : prev);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleShare = () => {
    if (!list) return;
    
    if (navigator.share) {
      navigator.share({
        title: list.name,
        text: list.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const handleDeleteList = async () => {
    if (!list || !id) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting list:', error);
        alert("Failed to delete list. Please try again.");
        return;
      }

      navigate('/lists');
      alert("List deleted successfully!");
    } catch (error) {
      console.error('Error:', error);
      alert("Failed to delete list. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProfileClick = () => {
    if (list?.author?.user_id) {
      navigate(`/profile/${list.author.user_id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <HeaderBanner />
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
              <h1 className="text-2xl font-medium">List</h1>
            </div>
          </div>
          <div className="p-4 space-y-6">
            <Card className="restaurant-card">
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-12 w-12 bg-muted rounded-full mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                  <div className="h-3 bg-muted rounded mb-2 w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <MobileNavigation />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <HeaderBanner />
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
              <h1 className="text-2xl font-medium">List</h1>
            </div>
          </div>
          <div className="p-4 text-center">
            <h3 className="font-medium mb-2">List not found</h3>
            <p className="text-sm text-muted-foreground">The list you're looking for doesn't exist or you don't have access to it.</p>
          </div>
        </div>
        <MobileNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />
      
      {/* Content with top padding for fixed banner */}
      <div className="safe-area-content">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center justify-between">
            <Button 
              onClick={() => navigate("/lists")}
              variant="ghost" 
              size="icon"
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-medium">List</h1>
            <div className="w-10 h-10" />
          </div>
        </div>

        <div className="p-4 space-y-6">
        {/* List Header */}
        <Card className="restaurant-card">
          <CardContent className="p-4">
            {/* Row 1: Profile pic, username, and menu */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 cursor-pointer flex-shrink-0" onClick={handleProfileClick}>
                  <AvatarImage src={list.author.avatar_url} />
                  <AvatarFallback className="bg-muted">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-medium cursor-pointer hover:text-foreground" onClick={handleProfileClick}>@{list.author.username}</p>
              </div>
              <div className="flex items-center gap-1">
                {!list.is_public && <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                <DropdownMenu key={`list-menu-${list.id}`}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-8 w-8"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50 bg-background">
                  {list.author?.isOwner ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => navigate(`/edit-list/${id}`)}
                        className="cursor-pointer focus:bg-muted focus:text-foreground"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit List
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(`/add-to-list/${id}`)}
                        className="cursor-pointer focus:bg-muted focus:text-foreground"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Restaurants
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleShare}
                        className="cursor-pointer focus:bg-muted focus:text-foreground"
                      >
                        <Share className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete List
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem
                        onClick={handleShare}
                        className="cursor-pointer focus:bg-muted focus:text-foreground"
                      >
                        <Share className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowReportDialog(true)}
                        className="cursor-pointer focus:bg-muted focus:text-foreground"
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        Report
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>

            {/* Row 2: List name */}
            <div className="mb-4">
              <h2 className="font-normal text-xl leading-normal break-words">{list.name}</h2>
            </div>
            
            {/* Row 3: Description with expand/collapse */}
            {list.description && (
              <div className="mb-3">
                <p 
                  className={`text-sm text-muted-foreground leading-relaxed break-words overflow-hidden cursor-pointer whitespace-pre-line ${!isDescriptionExpanded ? 'line-clamp-[2.5]' : ''}`}
                  style={!isDescriptionExpanded ? { 
                    display: '-webkit-box',
                    WebkitLineClamp: '2',
                    WebkitBoxOrient: 'vertical',
                    maxHeight: '3.75em', // 1.5em line-height * 2.5 lines
                    lineHeight: '1.5em'
                  } as React.CSSProperties : { lineHeight: '1.5em' }}
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                >
                  {list.description}
                </p>
              </div>
            )}

            {/* Last row: Like button */}
            <div className="flex items-center pt-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLike}
                disabled={list.author.isOwner && list.likes === 0}
                className={`flex items-center ${liked ? 'text-primary' : 'text-muted-foreground'} ${list.author.isOwner && list.likes > 0 ? 'cursor-pointer' : !list.author.isOwner ? 'cursor-pointer' : ''}`}
              >
                <Heart className={`h-4 w-4 mr-1 ${liked ? 'fill-current' : ''}`} />
                <span>{list.likes === 0 ? 'No likes yet' : list.likes}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Restaurants List */}
        <div className="space-y-3">
          {list.restaurants && list.restaurants.length > 0 ? (
            list.restaurants.map((restaurant) => (
            <Card 
              key={restaurant.id} 
              className="restaurant-card"
            >
              <CardContent className="p-4">
                <div 
                  className="cursor-pointer"
                  onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      {list.isRanked && (
                        <div className="bg-primary text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">
                          {restaurant.rank}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{restaurant.name}</h4>
                        {restaurant.notes && (
                          <p className="text-sm text-muted-foreground/70 mt-1 whitespace-pre-wrap">{restaurant.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))
          ) : unfilteredRestaurantsCount > 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No restaurants match your filters</p>
              </CardContent>
            </Card>
          ) : null}

          {/* Add Restaurant Button */}
          {list.author?.isOwner && (
            <Button
              onClick={() => navigate(`/add-to-list/${id}`)}
              variant="outline"
              className="w-full h-14 border-dashed hover:bg-muted/50"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Restaurant
            </Button>
          )}
        </div>

        </div>
      </div>

      {/* Report Dialog */}
      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        contentType="list"
        contentId={id || ''}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this list? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteList}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Likes Dialog */}
      <AlertDialog open={showLikesDialog} onOpenChange={setShowLikesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Liked by</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-3 py-4">
            {likedByUsers.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                onClick={() => {
                  navigate(`/profile/${user.user_id}`);
                  setShowLikesDialog(false);
                }}
              >
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-muted">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNavigation />
    </div>
  );
};

export default ListDetail;