import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, ChevronDown, ChevronRight, Check, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import HierarchicalCuisineFilter from "./HierarchicalCuisineFilter";
import { z } from "zod";
import { toast } from "sonner";

/* Schema for rating input validation - must be between 0.0 and 5.0 with max 1 decimal */
const ratingSchema = z.string().refine((val) => {
  if (!val.trim()) return false;
  const num = Number(val);
  if (isNaN(num) || num < 0 || num > 5) return false;
  // Check max 1 decimal place
  const decimalPart = val.split('.')[1];
  return !decimalPart || decimalPart.length <= 1;
}, { message: "Rating must be between 0.0 and 5.0 with max 1 decimal place" });

export interface RestaurantFilterOptions {
  sortBy: 'distance' | 'rating' | 'name' | 'price' | 'popularity' | 'personalRating' | 'averageRating' | 'list_order' | 'recently-added' | 'recently-visited';
  cuisines: string;
  ratingRange: [number, number];
  includeNotRated?: boolean;
  timePeriod?: '24h' | 'week' | 'month' | 'year' | 'all';
  distance?: number; // Distance in km
}

interface RestaurantFilterButtonProps {
  filters: RestaurantFilterOptions;
  onFiltersChange: (filters: RestaurantFilterOptions) => void;
  hasLocation?: boolean;
  showTimePeriod?: boolean;
  customSortOptions?: Array<{ value: RestaurantFilterOptions['sortBy']; label: string }>;
  hideRatingFilter?: boolean;
  hideCuisineFilter?: boolean;
  userLocation?: { latitude: number; longitude: number };
  defaultDistance?: number; // Default distance for this specific page
  enableSortOptions?: boolean;
  enableDistanceFilter?: boolean;
  availableCuisines?: Set<string>; // Optional: only show cuisines available in nearby restaurants
}

/* Schema for distance input validation - must be positive integer max 5 digits */
const distanceSchema = z.string().refine((val) => {
  if (!val.trim()) return false;
  const num = Number(val);
  return Number.isInteger(num) && num > 0 && num <= 99999;
}, { message: "Distance must be a positive whole number (max 5 digits)" });

const RestaurantFilterButton = ({
  filters,
  onFiltersChange,
  hasLocation = false,
  showTimePeriod = false,
  customSortOptions,
  hideRatingFilter = false,
  hideCuisineFilter = false,
  userLocation,
  defaultDistance,
  enableSortOptions = true,
  enableDistanceFilter = true,
  availableCuisines,
}: RestaurantFilterButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customDistance, setCustomDistance] = useState<string>("");
  const [minRating, setMinRating] = useState<string>("");
  const [maxRating, setMaxRating] = useState<string>("");
  const [showCustomRating, setShowCustomRating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{
    sortBy: boolean;
    cuisines: boolean;
    ratingRange: boolean;
    timePeriod: boolean;
    distance: boolean;
  }>({
    sortBy: false,
    cuisines: false,
    ratingRange: false,
    timePeriod: false,
    distance: false,
  });


  /* Note: Cuisine filtering is now handled by HierarchicalCuisineFilter component
     which automatically filters cuisines based on restaurants matching current filters */


  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateFilter = <K extends keyof RestaurantFilterOptions>(
    key: K,
    value: RestaurantFilterOptions[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
    // Close the section after selection (except for rating range)
    if (key !== 'ratingRange') {
      setExpandedSections(prev => ({
        ...prev,
        [key]: false
      }));
    }
  };

  const sortByOptions = customSortOptions || [
    ...(hasLocation ? [{ value: 'distance' as const, label: 'Distance' }] : []),
    ...(showTimePeriod ? [{ value: 'popularity' as const, label: 'Popularity' }] : []),
    { value: 'rating' as const, label: 'Rating' },
    { value: 'name' as const, label: 'Name' },
    ...(!showTimePeriod ? [{ value: 'price' as const, label: 'Price' }] : []),
  ];

  const timePeriodOptions = [
    { value: '24h' as const, label: 'Last 24 hours' },
    { value: 'week' as const, label: 'Last week' },
    { value: 'month' as const, label: 'Last month' },
    { value: 'year' as const, label: 'Last year' },
    { value: 'all' as const, label: 'All time' },
  ];

  const getCurrentCuisineLabel = () => {
    return filters.cuisines || 'Any';
  };

  const handleCustomDistanceApply = () => {
    const validation = distanceSchema.safeParse(customDistance);
    if (!validation.success) {
      toast.error("Distance must be a positive whole number (max 5 digits)");
      return;
    }
    
    const distance = Number(customDistance);
    updateFilter('distance', distance);
    setCustomDistance("");
  };

  const handleCustomDistanceKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCustomDistanceApply();
    }
  };

  const handleMinRatingApply = () => {
    const validation = ratingSchema.safeParse(minRating);
    if (!validation.success) {
      toast.error("Rating must be between 0.0 and 5.0 with max 1 decimal place");
      return;
    }
    
    const min = Number(minRating);
    const max = Math.max(min, filters.ratingRange[1]);
    updateFilter('ratingRange', [min, max]);
    setMinRating("");
  };

  const handleMaxRatingApply = () => {
    const validation = ratingSchema.safeParse(maxRating);
    if (!validation.success) {
      toast.error("Rating must be between 0.0 and 5.0 with max 1 decimal place");
      return;
    }
    
    const max = Number(maxRating);
    const min = Math.min(max, filters.ratingRange[0]);
    updateFilter('ratingRange', [min, max]);
    setMaxRating("");
  };

  const handleRatingKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, type: 'min' | 'max' | 'both') => {
    if (e.key === 'Enter') {
      if (type === 'both') {
        if (minRating.trim()) handleMinRatingApply();
        if (maxRating.trim()) handleMaxRatingApply();
      } else if (type === 'min') {
        handleMinRatingApply();
      } else {
        handleMaxRatingApply();
      }
    }
  };

  const handleRatingInputChange = (value: string, setter: (val: string) => void) => {
    // Allow only numbers and one decimal point
    const filtered = value.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = filtered.split('.');
    if (parts.length > 2) return;
    // Limit to one decimal place
    if (parts[1] && parts[1].length > 1) return;
    // Limit first part to 1 digit (0-5)
    if (parts[0] && parts[0].length > 1) return;
    setter(filtered);
  };

  // Helper to format rating display (remove .0, keep .5)
  const formatRating = (rating: number): string => {
    if (rating % 1 === 0) {
      return rating.toString(); // 5.0 → "5", 4.0 → "4"
    }
    return rating.toFixed(1); // 3.5 → "3.5"
  };

  const defaultSortBy = customSortOptions?.[0]?.value || (hasLocation ? 'distance' : 'rating');
  const defaultTimePeriod = showTimePeriod ? (customSortOptions?.[0]?.value === 'popularity' ? 'month' : 'all') : undefined;
  
  /* Determine if distance filter is active based on whether defaultDistance prop was explicitly set */
  const isDistanceActive = enableDistanceFilter
    ? (defaultDistance !== undefined
        ? filters.distance !== defaultDistance
        : filters.distance !== undefined)
    : false;

  const sortFilterActive = enableSortOptions && filters.sortBy !== defaultSortBy;
  const cuisineFilterActive = !hideCuisineFilter && Boolean(filters.cuisines && filters.cuisines !== 'Any');
  const ratingFilterActive = !hideRatingFilter && (filters.ratingRange[0] !== 0 || filters.ratingRange[1] !== 5);
  const distanceFilterActive = enableDistanceFilter && isDistanceActive;
  const timeFilterActive = showTimePeriod && filters.timePeriod !== defaultTimePeriod;

  const hasActiveFilters =
    sortFilterActive ||
    cuisineFilterActive ||
    ratingFilterActive ||
    distanceFilterActive ||
    timeFilterActive;

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
                const resetDistance =
                  enableDistanceFilter && defaultDistance !== undefined ? defaultDistance : undefined;
                onFiltersChange({
                  sortBy: defaultSortBy,
                  cuisines: 'Any',
                  ratingRange: [0, 5],
                  includeNotRated: filters.includeNotRated,
                  timePeriod: showTimePeriod ? defaultTimePeriod : filters.timePeriod,
                  distance: enableDistanceFilter ? resetDistance : undefined,
                });
                setCustomDistance("");
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
          {enableSortOptions && (
            <div>
              <button
                onClick={() => toggleSection('sortBy')}
                className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
              >
                <div>
                  <span className="font-medium text-sm">Sort by: </span>
                  <span>{sortByOptions.find(opt => opt.value === filters.sortBy)?.label || 'Distance'}</span>
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
          )}

          {/* Cuisine Section */}
          {!hideCuisineFilter && (
            <div>
              <button
                onClick={() => toggleSection('cuisines')}
                className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
              >
                <div>
                  <span className="font-medium text-sm">Cuisine: </span>
                  <span>{getCurrentCuisineLabel()}</span>
                </div>
                {expandedSections.cuisines ? 
                  <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                }
              </button>
              {expandedSections.cuisines && (
                <div className="mt-2">
                  <HierarchicalCuisineFilter 
                    selectedCuisine={filters.cuisines}
                    onCuisineSelect={(cuisineName) => updateFilter('cuisines', cuisineName)}
                    availableCuisines={availableCuisines}
                  />
                </div>
              )}
            </div>
          )}

          {/* Rating Range Section */}
          {!hideRatingFilter && (
            <>
              <div>
                <button
                  onClick={() => toggleSection('ratingRange')}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                >
                  <div>
                    <span className="font-medium text-sm">Rating: </span>
                    <span>
                      {filters.ratingRange[0] === 0 && filters.ratingRange[1] === 5 
                        ? "Any" 
                        : `${formatRating(filters.ratingRange[0])}-${formatRating(filters.ratingRange[1])}`
                      }
                    </span>
                  </div>
                  {expandedSections.ratingRange ? 
                    <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  }
                </button>
                {expandedSections.ratingRange && (
                  <div className="mt-2 space-y-2">
                    <button
                      onClick={() => {
                        updateFilter('ratingRange', [0, 5]);
                        setMinRating("");
                        setMaxRating("");
                        setShowCustomRating(false);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                    >
                      <span>Any</span>
                      {filters.ratingRange[0] === 0 && filters.ratingRange[1] === 5 && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowCustomRating(!showCustomRating);
                        // Pre-populate inputs with current values if not default
                        if (!showCustomRating) {
                          if (filters.ratingRange[0] !== 0) {
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
                        {(filters.ratingRange[0] !== 0 || filters.ratingRange[1] !== 5) && 
                          ` (${formatRating(filters.ratingRange[0])}-${formatRating(filters.ratingRange[1])})`
                        }
                      </span>
                      {(filters.ratingRange[0] !== 0 || filters.ratingRange[1] !== 5) && (
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
                              onKeyPress={(e) => handleRatingKeyPress(e, 'both')}
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
                              onKeyPress={(e) => handleRatingKeyPress(e, 'both')}
                              className="text-sm h-9"
                              maxLength={3}
                            />
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          onClick={() => {
                            if (minRating.trim()) handleMinRatingApply();
                            if (maxRating.trim()) handleMaxRatingApply();
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
            </>
          )}

          {hasLocation && enableDistanceFilter && (
            <>
              {/* Distance Section */}
              <div>
                <button
                  onClick={() => toggleSection('distance')}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                >
                  <div>
                    <span className="font-medium text-sm">Distance: </span>
                    <span>{filters.distance ? `${filters.distance} km` : 'Any'}</span>
                  </div>
                  {expandedSections.distance ? 
                    <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  }
                </button>
                {expandedSections.distance && (
                  <div className="mt-2 space-y-2">
                    <button
                      onClick={() => updateFilter('distance', undefined)}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                    >
                      <span>Any</span>
                      {filters.distance === undefined && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                    
                    <div className="p-2 space-y-2">
                      <Label className="text-xs text-muted-foreground">Custom distance (km)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={customDistance}
                          onChange={(e) => setCustomDistance(e.target.value.replace(/[^0-9]/g, ''))}
                          onKeyPress={handleCustomDistanceKeyPress}
                          className="flex-1"
                          maxLength={5}
                        />
                        <Button
                          size="sm"
                          onClick={handleCustomDistanceApply}
                          disabled={!customDistance.trim()}
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {showTimePeriod && (
            <>
              {/* Time Period Section */}
              <div>
                <button
                  onClick={() => toggleSection('timePeriod')}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                >
                  <div>
                    <span className="font-medium text-sm">Time: </span>
                    <span>
                      {timePeriodOptions.find(opt => opt.value === filters.timePeriod)?.label || 'Month'}
                    </span>
                  </div>
                  {expandedSections.timePeriod ? 
                    <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  }
                </button>
                {expandedSections.timePeriod && (
                  <div className="mt-2 space-y-1">
                    {timePeriodOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateFilter('timePeriod', option.value)}
                        className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                      >
                        <span>{option.label}</span>
                        {filters.timePeriod === option.value && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default RestaurantFilterButton;