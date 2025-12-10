import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Star, User, MoreVertical, Share, Flag, Trash2 } from "lucide-react";
import MobileNavigation from "@/components/MobileNavigation";
import HeaderBanner from "@/components/HeaderBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ReportDialog from "@/components/ReportDialog";

const Review = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reviewData, setReviewData] = useState(null);
  const [restaurantData, setRestaurantData] = useState(null);
  const [reviewerProfile, setReviewerProfile] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const fetchReviewData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Fetch review data
        const { data: review, error: reviewError } = await supabase
          .from('reviews')
          .select('*')
          .eq('id', id)
          .single();

        if (reviewError) {
          console.error('Error fetching review:', reviewError);
          return;
        }

        setReviewData(review);

        // Fetch reviewer profile
        const { data: profile } = await supabase
          .from('public_profiles')
          .select('username, full_name, avatar_url')
          .eq('user_id', review.user_id)
          .single();

        setReviewerProfile(profile);

        // Fetch restaurant data directly from database
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('id, name, address')
          .eq('id', review.restaurant_id)
          .single();

        if (restaurant) {
          setRestaurantData(restaurant);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviewData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <p>Loading review...</p>
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <p>Review not found</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  };

  const formatPriceLevel = (level) => {
    if (!level) return 'Not specified';
    const priceMap = {
      1: '$',
      2: '$$', 
      3: '$$$',
      4: '$$$$',
      5: '$$$$$'
    };
    return priceMap[level] || 'Not specified';
  };

  const formatPriceLevelText = (level) => {
    if (!level) return 'Not specified';
    const textMap = {
      1: 'Cheap',
      2: 'Affordable', 
      3: 'Moderate',
      4: 'Expensive',
      5: 'Luxury'
    };
    return textMap[level] || 'Not specified';
  };

  // Current user profile info
  const currentUser = { 
    name: authUser?.email?.split('@')[0] || "You", 
    avatar: "👤" 
  };

  const handleDeleteReview = async () => {
    if (!reviewData || !authUser) return;
    
    setIsDeleting(true);
    
    try {
      // Delete the review
      const { error: reviewError } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewData.id);

      if (reviewError) {
        console.error('Error deleting review:', reviewError);
        toast.error('Failed to delete review');
        return;
      }

      // Also remove from favorites if this restaurant was favorited
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('favorites')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (currentProfile?.favorites && Array.isArray(currentProfile.favorites)) {
        const currentFavorites = currentProfile.favorites as any[];
        const updatedFavorites = currentFavorites.filter((fav: any) => fav.id !== reviewData.restaurant_id);
        
        if (updatedFavorites.length !== currentFavorites.length) {
          // Restaurant was in favorites, update the array
          const { error: favoriteError } = await supabase
            .from('profiles')
            .update({ favorites: updatedFavorites })
            .eq('user_id', authUser.id);

          if (favoriteError) {
            console.error('Error removing from favorites:', favoriteError);
            // Don't show error to user as the main review deletion succeeded
          }
        }
      }

      toast.success('Review deleted successfully');
      navigate(-1); // Go back to previous page
    } catch (error) {
      console.error('Unexpected error deleting review:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />
      
      {/* Content with top padding for fixed banner */}
      <div className="safe-area-content">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center justify-center">
          <Button 
            onClick={() => navigate(-1)}
            variant="ghost" 
            size="icon"
            className="rounded-full absolute left-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-medium">Review</h1>
          <div className="absolute right-4 flex items-center gap-2">
            {reviewData && (
              <DropdownMenu key={`review-menu-${reviewData.id}`}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50 bg-background">
                  <DropdownMenuItem
                    onClick={handleShare}
                    className="cursor-pointer focus:bg-muted focus:text-foreground"
                  >
                    <Share className="h-4 w-4 mr-2" />
                    Share Review
                  </DropdownMenuItem>
                  {reviewData.user_id === authUser?.id ? (
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Review
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => setShowReportDialog(true)}
                      className="cursor-pointer focus:bg-muted focus:text-foreground"
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      Report Review
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

        <div className="p-4 space-y-4">
        {/* Review Card */}
        <Card className="review-card">
          <CardContent className="p-4">
            {/* Restaurant Header - Clickable */}
            <div 
              className="mb-4 cursor-pointer"
              onClick={() => navigate(`/restaurant/${reviewData.restaurant_id}`)}
            >
              <h3 className="text-lg font-medium hover:text-primary transition-colors mb-3">
                {restaurantData?.name || "Restaurant"}
              </h3>
            </div>

            {/* User Info */}
            <div className="flex items-start mb-4">
              <div className={`flex items-center flex-1 ${reviewData.user_id !== authUser?.id ? 'cursor-pointer' : ''}`} 
                   onClick={reviewData.user_id !== authUser?.id ? () => navigate(`/user/${reviewData.user_id}`) : undefined}>
                <div className={`w-10 h-10 mr-3 bg-muted rounded-full flex items-center justify-center overflow-hidden ${reviewData.user_id !== authUser?.id ? 'hover:scale-110' : ''} transition-transform`}>
                  {reviewerProfile?.avatar_url ? (
                    <img 
                      src={reviewerProfile.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${reviewData.user_id !== authUser?.id ? 'hover:text-primary' : ''} transition-colors`}>
                    @{reviewerProfile?.username || reviewerProfile?.full_name?.toLowerCase().replace(/\s+/g, '') || "anonymous"}
                  </h4>
                  <p className="text-sm text-muted-foreground">{formatDate(reviewData.created_at)}</p>
                  <div className="flex items-center mt-2">
                    {reviewData.rating ? (
                      Array.from({ length: Math.ceil(reviewData.rating) }, (_, i) => {
                        const starNumber = i + 1;
                        const rating = reviewData.rating;
                        const isFilled = starNumber <= Math.floor(rating);
                        const isHalf = starNumber === Math.floor(rating) + 1 && rating % 1 >= 0.5;
                        
                        return (
                          <div key={i} className="relative">
                            {isHalf ? (
                              <div className="relative">
                                <Star className="h-4 w-4 fill-current text-primary" style={{ clipPath: 'inset(0 50% 0 0)' }} />
                              </div>
                            ) : (
                              <Star className="h-4 w-4 fill-current text-primary" />
                            )}
                          </div>
                        );
                      })
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Review Text */}
            {reviewData.comment && (
              <p className="text-sm leading-relaxed mb-4 whitespace-pre-line">
                {reviewData.comment}
              </p>
            )}

            {/* Detailed Ratings */}
            {(reviewData.price_level || reviewData.value_for_money_rating || reviewData.food_rating || reviewData.drinks_rating || reviewData.service_rating || reviewData.atmosphere_rating) && (
              <div className="bg-muted/30 rounded-xl p-4 mb-4">
                <h4 className="font-medium mb-3 text-sm">Detailed Ratings</h4>
                <div className="space-y-2 text-xs">
                  {reviewData.price_level && (
                    <div className="flex items-center px-2">
                      <span className="text-muted-foreground w-24">Price Level</span>
                      <div className="ml-6">
                        <span className="text-sm text-muted-foreground">{formatPriceLevelText(reviewData.price_level)}</span>
                      </div>
                    </div>
                  )}
                  {reviewData.value_for_money_rating && (
                    <div className="flex items-center px-2">
                      <span className="text-muted-foreground w-24">Value for money</span>
                      <div className="flex items-center ml-6">
                        {Array.from({ length: Math.ceil(reviewData.value_for_money_rating) }, (_, i) => {
                          const starNumber = i + 1;
                          const rating = reviewData.value_for_money_rating;
                          const isFilled = starNumber <= Math.floor(rating);
                          const isHalf = starNumber === Math.floor(rating) + 1 && rating % 1 >= 0.5;
                          
                          return (
                            <div key={i}>
                              {isHalf ? (
                                <Star className="h-3 w-3 fill-current text-primary" style={{ clipPath: 'inset(0 50% 0 0)' }} />
                              ) : (
                                <Star className="h-3 w-3 fill-current text-primary" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {reviewData.food_rating && (
                    <div className="flex items-center px-2">
                      <span className="text-muted-foreground w-24">Food</span>
                      <div className="flex items-center ml-6">
                        {Array.from({ length: Math.ceil(reviewData.food_rating) }, (_, i) => {
                          const starNumber = i + 1;
                          const rating = reviewData.food_rating;
                          const isFilled = starNumber <= Math.floor(rating);
                          const isHalf = starNumber === Math.floor(rating) + 1 && rating % 1 >= 0.5;
                          
                          return (
                            <div key={i}>
                              {isHalf ? (
                                <Star className="h-3 w-3 fill-current text-primary" style={{ clipPath: 'inset(0 50% 0 0)' }} />
                              ) : (
                                <Star className="h-3 w-3 fill-current text-primary" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {reviewData.drinks_rating && (
                    <div className="flex items-center px-2">
                      <span className="text-muted-foreground w-24">Drinks</span>
                      <div className="flex items-center ml-6">
                        {Array.from({ length: Math.ceil(reviewData.drinks_rating) }, (_, i) => {
                          const starNumber = i + 1;
                          const rating = reviewData.drinks_rating;
                          const isFilled = starNumber <= Math.floor(rating);
                          const isHalf = starNumber === Math.floor(rating) + 1 && rating % 1 >= 0.5;
                          
                          return (
                            <div key={i}>
                              {isHalf ? (
                                <Star className="h-3 w-3 fill-current text-primary" style={{ clipPath: 'inset(0 50% 0 0)' }} />
                              ) : (
                                <Star className="h-3 w-3 fill-current text-primary" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {reviewData.service_rating && (
                    <div className="flex items-center px-2">
                      <span className="text-muted-foreground w-24">Service</span>
                      <div className="flex items-center ml-6">
                        {Array.from({ length: Math.ceil(reviewData.service_rating) }, (_, i) => {
                          const starNumber = i + 1;
                          const rating = reviewData.service_rating;
                          const isFilled = starNumber <= Math.floor(rating);
                          const isHalf = starNumber === Math.floor(rating) + 1 && rating % 1 >= 0.5;
                          
                          return (
                            <div key={i}>
                              {isHalf ? (
                                <Star className="h-3 w-3 fill-current text-primary" style={{ clipPath: 'inset(0 50% 0 0)' }} />
                              ) : (
                                <Star className="h-3 w-3 fill-current text-primary" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {reviewData.atmosphere_rating && (
                    <div className="flex items-center px-2">
                      <span className="text-muted-foreground w-24">Atmosphere</span>
                      <div className="flex items-center ml-6">
                        {Array.from({ length: Math.ceil(reviewData.atmosphere_rating) }, (_, i) => {
                          const starNumber = i + 1;
                          const rating = reviewData.atmosphere_rating;
                          const isFilled = starNumber <= Math.floor(rating);
                          const isHalf = starNumber === Math.floor(rating) + 1 && rating % 1 >= 0.5;
                          
                          return (
                            <div key={i}>
                              {isHalf ? (
                                <Star className="h-3 w-3 fill-current text-primary" style={{ clipPath: 'inset(0 50% 0 0)' }} />
                              ) : (
                                <Star className="h-3 w-3 fill-current text-primary" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Report Dialog */}
      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        contentType="review"
        contentId={id || ''}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReview}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNavigation />
    </div>
  );
};

export default Review;