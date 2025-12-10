import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Star, User } from "lucide-react";

interface ReviewCardProps {
  review: {
    id: string;
    user: string;
    username: string;
    userId: string;
    restaurant: string;
    restaurantId: string;
    rating?: number;
    review: string;
    avatarUrl?: string;
  };
  onPress: () => void;
}

const ReviewCard = ({ review, onPress }: ReviewCardProps) => {
  const navigate = useNavigate();

  // Helper function to render star rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-3 w-3 text-primary fill-current" />);
    }
    
    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative h-3 w-3">
          <Star className="h-3 w-3 text-primary fill-current absolute top-0 left-0" style={{ clipPath: 'inset(0 50% 0 0)' }} />
        </div>
      );
    }
    
    return stars;
  };

  return (
    <Card className="review-card min-w-[240px] cursor-pointer" onClick={onPress}>
      <CardContent className="p-3">
        <div className="flex items-center mb-2">
          <div 
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-2 cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/user/${review.userId}`);
            }}
          >
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col">
              <h4 className="font-medium text-xs truncate" title={review.restaurant}>
                {review.restaurant && review.restaurant.length > 22 
                  ? `${review.restaurant.substring(0, 22)}...` 
                  : review.restaurant}
              </h4>
              <p 
                className="text-xs text-muted-foreground cursor-pointer hover:text-primary truncate"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/user/${review.userId}`);
                }}
              >
                @{review.username}
              </p>
              {review.rating && (
                <div className="flex items-center mt-1">
                  {renderStars(review.rating)}
                </div>
              )}
            </div>
          </div>
        </div>
        {review.review && review.review.trim() && (
          <p className="text-xs text-foreground leading-relaxed">
            {review.review.length > 80 ? `${review.review.substring(0, 77)}...` : review.review}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewCard;