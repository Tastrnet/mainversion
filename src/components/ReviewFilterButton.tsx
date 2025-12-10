import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, ChevronDown, ChevronRight, Check, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import HierarchicalCuisineFilter from "./HierarchicalCuisineFilter";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export interface ReviewFilterOptions {
  sortBy: 'newest' | 'oldest' | 'rating' | 'name';
  cuisines: string;
  hasRating: 'any' | 'rated' | 'not-rated';
  ratingRange: [number, number];
  timePeriod: 'all' | '24h' | 'week' | 'month' | 'year';
  userId: string;
}

interface ReviewFilterButtonProps {
  filters: ReviewFilterOptions;
  onFiltersChange: (filters: ReviewFilterOptions) => void;
  currentUserId: string;
}

const ReviewFilterButton = ({ filters, onFiltersChange, currentUserId }: ReviewFilterButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Array<{ id: string; username: string }>>([]);
  const [expandedSections, setExpandedSections] = useState<{
    sortBy: boolean;
    tags: boolean;
    rating: boolean;
    time: boolean;
    user: boolean;
  }>({
    sortBy: false,
    tags: false,
    rating: false,
    time: false,
    user: false,
  });

  // Fetch users that current user follows
  useEffect(() => {
    const fetchFollowingUsers = async () => {
      if (!currentUserId) return;

      const { data: following } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', currentUserId);

      if (following && following.length > 0) {
        const userIds = following.map(f => f.following_id);
        
        const { data: profiles } = await supabase
          .from('public_profiles')
          .select('user_id, username')
          .in('user_id', userIds)
          .order('username');

        if (profiles) {
          setFollowingUsers(profiles.map(p => ({ id: p.user_id, username: p.username })));
        }
      }
    };
    
    fetchFollowingUsers();
  }, [currentUserId]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateFilter = <K extends keyof ReviewFilterOptions>(
    key: K,
    value: ReviewFilterOptions[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
    // Close the section after selection (except for rating toggle)
    if (key !== 'hasRating') {
      setExpandedSections(prev => ({
        ...prev,
        [key]: false
      }));
    }
  };

  const sortByOptions = [
    { value: 'newest' as const, label: 'Newest' },
    { value: 'oldest' as const, label: 'Oldest' },
    { value: 'rating' as const, label: 'Rating' },
    { value: 'name' as const, label: 'Restaurant name' },
  ];

  const getCurrentCuisineLabel = () => {
    return filters.cuisines === 'Any' ? 'Any' : filters.cuisines || 'Any';
  };

  const getRatingLabel = () => {
    switch (filters.hasRating) {
      case 'rated':
        return `Rated (${filters.ratingRange[0]}-${filters.ratingRange[1]})`;
      case 'not-rated':
        return 'Not rated';
      default:
        return 'Any';
    }
  };

  const getTimeLabel = () => {
    switch (filters.timePeriod) {
      case '24h':
        return 'Last 24 hours';
      case 'week':
        return 'Last week';
      case 'month':
        return 'Last month';
      case 'year':
        return 'Last year';
      default:
        return 'All time';
    }
  };

  const getUserLabel = () => {
    if (filters.userId === 'all') return 'All users';
    const user = followingUsers.find(u => u.id === filters.userId);
    return user ? `@${user.username}` : 'All users';
  };

  const hasActiveFilters = 
    filters.sortBy !== 'newest' ||
    filters.cuisines !== 'Any' ||
    filters.hasRating !== 'any' ||
    filters.timePeriod !== 'all' ||
    filters.userId !== 'all';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <Filter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end">
        {hasActiveFilters && (
          <div className="flex justify-end mb-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                onFiltersChange({
                  sortBy: 'newest',
                  cuisines: 'Any',
                  hasRating: 'any',
                  ratingRange: [0.5, 5],
                  timePeriod: 'all',
                  userId: 'all',
                });
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="space-y-4">
          {/* Sort By Section */}
          <div>
            <button
              onClick={() => toggleSection('sortBy')}
              className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
            >
              <div>
                <span className="font-medium text-sm">Sort by: </span>
                <span>{sortByOptions.find(opt => opt.value === filters.sortBy)?.label || 'Newest'}</span>
              </div>
              {expandedSections.sortBy ? 
                <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              }
            </button>
            {expandedSections.sortBy && (
              <div className="mt-2 space-y-1">
                {sortByOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateFilter('sortBy', option.value)}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                  >
                    <span>{option.label}</span>
                    {filters.sortBy === option.value && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cuisines Section */}
          <div>
            <button
              onClick={() => toggleSection('tags')}
              className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
            >
              <div>
                <span className="font-medium text-sm">Cuisine: </span>
                <span>{getCurrentCuisineLabel()}</span>
              </div>
              {expandedSections.tags ? 
                <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              }
            </button>
            {expandedSections.tags && (
              <div className="mt-2 p-2">
                <HierarchicalCuisineFilter 
                  selectedCuisine={filters.cuisines}
                  onCuisineSelect={(cuisineName) => updateFilter('cuisines', cuisineName)}
                />
              </div>
            )}
          </div>

          {/* Rating Section */}
          <div>
            <button
              onClick={() => toggleSection('rating')}
              className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
            >
              <div>
                <span className="font-medium text-sm">Rating: </span>
                <span>{getRatingLabel()}</span>
              </div>
              {expandedSections.rating ? 
                <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              }
            </button>
            {expandedSections.rating && (
              <div className="mt-2 px-2 space-y-3">
                <button
                  onClick={() => updateFilter('hasRating', 'any')}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                >
                  <span>Any</span>
                  {filters.hasRating === 'any' && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
                <button
                  onClick={() => updateFilter('hasRating', 'rated')}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                >
                  <span>Rated ({filters.ratingRange[0]}-{filters.ratingRange[1]})</span>
                  {filters.hasRating === 'rated' && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
                {filters.hasRating === 'rated' && (
                  <div className="px-2 space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Rating Range: {filters.ratingRange[0]} - {filters.ratingRange[1]}
                    </Label>
                    <Slider
                      min={0.5}
                      max={5}
                      step={0.5}
                      value={filters.ratingRange}
                      onValueChange={(value) => updateFilter('ratingRange', value as [number, number])}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0.5</span>
                      <span>5</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => updateFilter('hasRating', 'not-rated')}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                >
                  <span>Not rated</span>
                  {filters.hasRating === 'not-rated' && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Time Period Section */}
          <div>
            <button
              onClick={() => toggleSection('time')}
              className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
            >
              <div>
                <span className="font-medium text-sm">Time: </span>
                <span>{getTimeLabel()}</span>
              </div>
              {expandedSections.time ? 
                <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              }
            </button>
            {expandedSections.time && (
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => updateFilter('timePeriod', 'all')}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                >
                  <span>All time</span>
                  {filters.timePeriod === 'all' && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
                <button
                  onClick={() => updateFilter('timePeriod', '24h')}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                >
                  <span>Last 24 hours</span>
                  {filters.timePeriod === '24h' && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
                <button
                  onClick={() => updateFilter('timePeriod', 'week')}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                >
                  <span>Last week</span>
                  {filters.timePeriod === 'week' && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
                <button
                  onClick={() => updateFilter('timePeriod', 'month')}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                >
                  <span>Last month</span>
                  {filters.timePeriod === 'month' && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
                <button
                  onClick={() => updateFilter('timePeriod', 'year')}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                >
                  <span>Last year</span>
                  {filters.timePeriod === 'year' && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* User Section */}
          <div>
            <button
              onClick={() => toggleSection('user')}
              className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
            >
              <div>
                <span className="font-medium text-sm">User: </span>
                <span>{getUserLabel()}</span>
              </div>
              {expandedSections.user ? 
                <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              }
            </button>
            {expandedSections.user && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                <button
                  onClick={() => updateFilter('userId', 'all')}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                >
                  <span>All users</span>
                  {filters.userId === 'all' && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
                {followingUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => updateFilter('userId', user.id)}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                  >
                    <span>@{user.username}</span>
                    {filters.userId === user.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ReviewFilterButton;
