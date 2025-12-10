import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, ChevronDown, ChevronRight, Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export interface FilterOptions {
  sortBy: 'latest_updated' | 'name' | 'popularity';
  visibility: 'any' | 'public' | 'private';
  ranked: 'any' | 'ranked' | 'not_ranked';
}

interface FilterButtonProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  hideVisibility?: boolean;
}

const FilterButton = ({ filters, onFiltersChange, hideVisibility = false }: FilterButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{
    sortBy: boolean;
    visibility: boolean;
    ranked: boolean;
  }>({
    sortBy: false,
    visibility: false,
    ranked: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateFilter = <K extends keyof FilterOptions>(
    key: K,
    value: FilterOptions[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
    // Close the section after selection
    setExpandedSections(prev => ({
      ...prev,
      [key]: false
    }));
  };

  const sortByOptions = [
    { value: 'latest_updated' as const, label: 'Latest updated' },
    { value: 'name' as const, label: 'List name' },
    { value: 'popularity' as const, label: 'List popularity' },
  ];

  const visibilityOptions = [
    { value: 'any' as const, label: 'Any' },
    { value: 'public' as const, label: 'Public' },
    { value: 'private' as const, label: 'Private' },
  ];

  const rankedOptions = [
    { value: 'any' as const, label: 'Any' },
    { value: 'ranked' as const, label: 'Ranked' },
    { value: 'not_ranked' as const, label: 'Not Ranked' },
  ];

  const getCurrentLabel = (value: string, options: Array<{ value: string; label: string }>) => {
    return options.find(option => option.value === value)?.label || '';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <Filter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end">
        <div className="space-y-4">
          {/* Sort By Section */}
          <div>
            <button
              onClick={() => toggleSection('sortBy')}
              className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
            >
              <div>
                <span className="font-medium text-sm">Sort by: </span>
                <span>{getCurrentLabel(filters.sortBy, sortByOptions)}</span>
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

          {/* List Visibility Section */}
          {!hideVisibility && (
            <>
              <div>
                <button
                  onClick={() => toggleSection('visibility')}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                >
                  <div>
                    <span className="font-medium text-sm">List Visibility: </span>
                    <span>{getCurrentLabel(filters.visibility, visibilityOptions)}</span>
                  </div>
                  {expandedSections.visibility ? 
                    <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  }
                </button>
                {expandedSections.visibility && (
                  <div className="mt-2 space-y-1">
                    {visibilityOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateFilter('visibility', option.value)}
                        className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                      >
                        <span>{option.label}</span>
                        {filters.visibility === option.value && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Ranked Section */}
          <div>
            <button
              onClick={() => toggleSection('ranked')}
              className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
            >
              <div>
                <span className="font-medium text-sm">Ranked: </span>
                <span>{getCurrentLabel(filters.ranked, rankedOptions)}</span>
              </div>
              {expandedSections.ranked ? 
                <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              }
            </button>
            {expandedSections.ranked && (
              <div className="mt-2 space-y-1">
                {rankedOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateFilter('ranked', option.value)}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted text-left"
                  >
                    <span>{option.label}</span>
                    {filters.ranked === option.value && (
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

export default FilterButton;