import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, ChevronDown, ChevronRight, Check, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { toast } from "sonner";


export interface RestaurantReviewFilterOptions {
  sortBy: 'newest' | 'oldest' | 'rating';
  hasRating: 'any' | 'rated';
  ratingRange: [number, number];
  timePeriod: 'all' | '24h' | 'week' | 'month' | 'year';
  showFrom: 'everyone' | 'friends' | 'you';
}

interface RestaurantReviewFilterButtonProps {
  filters: RestaurantReviewFilterOptions;
  onFiltersChange: (filters: RestaurantReviewFilterOptions) => void;
}

/* Schema for rating input validation - must be between 0 and 5.0, only .5 increments */
const ratingSchema = z.string().refine((val) => {
  if (!val.trim()) return false;
  const num = Number(val);
  if (isNaN(num) || num < 0 || num > 5) return false;
  // Only allow whole numbers or .5 increments
  const decimalPart = val.split('.')[1];
  if (decimalPart && decimalPart !== '5') return false;
  if (decimalPart && decimalPart.length > 1) return false;
  return true;
}, { message: "Rating must be between 0 and 5.0, only .5 increments allowed" });

const RestaurantReviewFilterButton = ({ filters, onFiltersChange }: RestaurantReviewFilterButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [minRating, setMinRating] = useState<string>("");
  const [maxRating, setMaxRating] = useState<string>("");
  const [showCustomRating, setShowCustomRating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{
    sortBy: boolean;
    rating: boolean;
    time: boolean;
  }>({
    sortBy: false,
    rating: false,
    time: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateFilter = <K extends keyof RestaurantReviewFilterOptions>(
    key: K,
    value: RestaurantReviewFilterOptions[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  // Helper to format rating display (remove .0, keep .5)
  const formatRating = (rating: number): string => {
    if (rating % 1 === 0) {
      return rating.toString();
    }
    return rating.toFixed(1);
  };

  const handleMinRatingApply = () => {
    if (!minRating.trim()) return;
    const validation = ratingSchema.safeParse(minRating);
    if (!validation.success) {
      toast.error("Rating must be between 0 and 5.0, only .5 increments allowed");
      return;
    }
    
    const min = Number(minRating);
    const max = Math.max(min, filters.ratingRange[1]);
    updateFilter('ratingRange', [min, max]);
    // If min is 0, allow unrated reviews, otherwise only rated
    if (min === 0) {
      updateFilter('hasRating', 'any');
    } else {
      updateFilter('hasRating', 'rated');
    }
    setMinRating("");
  };

  const handleMaxRatingApply = () => {
    if (!maxRating.trim()) return;
    const validation = ratingSchema.safeParse(maxRating);
    if (!validation.success) {
      toast.error("Rating must be between 0 and 5.0, only .5 increments allowed");
      return;
    }
    
    const max = Number(maxRating);
    const min = Math.min(max, filters.ratingRange[0]);
    updateFilter('ratingRange', [min, max]);
    // If min is 0, allow unrated reviews, otherwise only rated
    if (min === 0) {
      updateFilter('hasRating', 'any');
    } else {
      updateFilter('hasRating', 'rated');
    }
    setMaxRating("");
  };

  const handleRatingKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (minRating.trim()) handleMinRatingApply();
      if (maxRating.trim()) handleMaxRatingApply();
    }
  };

  const handleRatingInputChange = (value: string, setter: (val: string) => void) => {
    // Allow only numbers and one decimal point
    const filtered = value.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = filtered.split('.');
    if (parts.length > 2) return;
    // Limit first part to 1 digit (0-5)
    if (parts[0] && parts[0].length > 1) return;
    // If there's a decimal part, only allow '5' (for .5 increments)
    if (parts[1] && parts[1] !== '5' && parts[1].length > 0) {
      // If user types something other than 5, don't allow it
      if (parts[1].length === 1 && parts[1] !== '5') {
        return;
      }
      // Limit to one character after decimal (only '5')
      if (parts[1].length > 1) return;
    }
    setter(filtered);
  };

  const sortByOptions = [
    { value: 'newest' as const, label: 'Newest' },
    { value: 'oldest' as const, label: 'Oldest' },
    { value: 'rating' as const, label: 'Rating' },
  ];

  const getRatingLabel = () => {
    if (filters.ratingRange[0] === 0.5 && filters.ratingRange[1] === 5) {
      return 'Any';
    }
    const minLabel = filters.ratingRange[0] === 0 ? '0' : formatRating(filters.ratingRange[0]);
    return `${minLabel}-${formatRating(filters.ratingRange[1])}`;
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

  const hasActiveFilters = 
    filters.sortBy !== 'newest' ||
    (filters.ratingRange[0] !== 0.5 || filters.ratingRange[1] !== 5) ||
    filters.timePeriod !== 'all';

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
                  hasRating: 'any',
                  ratingRange: [0.5, 5],
                  timePeriod: 'all',
                  showFrom: filters.showFrom, // Keep existing showFrom value
                });
                setMinRating("");
                setMaxRating("");
                setShowCustomRating(false);
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
              <div className="mt-2 space-y-2">
                <button
                  onClick={() => {
                    updateFilter('ratingRange', [0.5, 5]);
                    updateFilter('hasRating', 'any');
                    setMinRating("");
                    setMaxRating("");
                    setShowCustomRating(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                >
                  <span>Any</span>
                  {(filters.ratingRange[0] === 0.5 && filters.ratingRange[1] === 5) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setShowCustomRating(!showCustomRating);
                    // Pre-populate inputs with current values if not default
                    if (!showCustomRating) {
                      if (filters.ratingRange[0] !== 0.5) {
                        setMinRating(formatRating(filters.ratingRange[0]));
                      }
                      if (filters.ratingRange[1] !== 5) {
                        setMaxRating(formatRating(filters.ratingRange[1]));
                      }
                    }
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                >
                  <span>
                    Custom
                    {(filters.ratingRange[0] !== 0.5 || filters.ratingRange[1] !== 5) && 
                      ` (${formatRating(filters.ratingRange[0])}-${formatRating(filters.ratingRange[1])})`
                    }
                  </span>
                  {(filters.ratingRange[0] !== 0.5 || filters.ratingRange[1] !== 5) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
                
                {showCustomRating && (
                  <div className="p-2 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Min</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={minRating}
                          onChange={(e) => handleRatingInputChange(e.target.value, setMinRating)}
                          onKeyPress={handleRatingKeyPress}
                          className="text-sm h-9"
                          maxLength={3}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={maxRating}
                          onChange={(e) => handleRatingInputChange(e.target.value, setMaxRating)}
                          onKeyPress={handleRatingKeyPress}
                          className="text-sm h-9"
                          maxLength={3}
                        />
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => {
                        // Apply both min and max if provided
                        let newMin = filters.ratingRange[0];
                        let newMax = filters.ratingRange[1];
                        let hasValidInput = false;

                        // Validate and apply min rating
                        if (minRating.trim()) {
                          const minValidation = ratingSchema.safeParse(minRating);
                          if (!minValidation.success) {
                            toast.error("Min rating must be between 0 and 5.0, only .5 increments allowed");
                            return;
                          }
                          newMin = Number(minRating);
                          hasValidInput = true;
                        }

                        // Validate and apply max rating
                        if (maxRating.trim()) {
                          const maxValidation = ratingSchema.safeParse(maxRating);
                          if (!maxValidation.success) {
                            toast.error("Max rating must be between 0 and 5.0, only .5 increments allowed");
                            return;
                          }
                          newMax = Number(maxRating);
                          hasValidInput = true;
                        }

                        // If no input provided, don't do anything
                        if (!hasValidInput) {
                          return;
                        }

                        // Ensure min <= max
                        if (newMin > newMax) {
                          [newMin, newMax] = [newMax, newMin];
                        }

                        // Apply both filter values in a single update
                        onFiltersChange({
                          ...filters,
                          ratingRange: [newMin, newMax],
                          // If min is 0, allow unrated reviews, otherwise only rated
                          hasRating: newMin === 0 ? 'any' : 'rated',
                        });
                        
                        setMinRating("");
                        setMaxRating("");
                      }}
                      disabled={!minRating.trim() && !maxRating.trim()}
                      className="w-full"
                    >
                      Apply
                    </Button>
                  </div>
                )}
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

        </div>
      </PopoverContent>
    </Popover>
  );
};

export default RestaurantReviewFilterButton;