import { useEffect, useRef, useState, useCallback } from "react";

interface WheelPickerProps {
  value: number;
  onChange: (value: number) => void;
  options: { value: number; label: string }[];
  itemHeight?: number;
}

const WheelPicker = ({ value, onChange, options, itemHeight = 36 }: WheelPickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const rafRef = useRef<number>();
  const [centerIndex, setCenterIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const selectedIndex = options.findIndex(opt => opt.value === value);
    if (selectedIndex !== -1) {
      const scrollTop = selectedIndex * itemHeight;
      container.scrollTop = scrollTop;
      setCenterIndex(selectedIndex);
    }
  }, [value, options, itemHeight]);

  const updateCenterIndex = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const scrollTop = container.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    setCenterIndex(index);
  }, [itemHeight]);

  const handleScroll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      updateCenterIndex();
      
      const container = containerRef.current;
      if (!container) return;

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const scrollTop = container.scrollTop;
        const index = Math.round(scrollTop / itemHeight);
        const clampedIndex = Math.max(0, Math.min(index, options.length - 1));
        
        if (options[clampedIndex] && options[clampedIndex].value !== value) {
          onChange(options[clampedIndex].value);
        }

        container.scrollTop = clampedIndex * itemHeight;
      }, 100);
    });
  }, [itemHeight, onChange, options, value, updateCenterIndex]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative h-[150px] overflow-hidden rounded-md border border-border">
      {/* Selection indicator */}
      <div 
        className="absolute left-0 right-0 bg-muted/40 border-y border-border pointer-events-none z-10"
        style={{ 
          top: `calc(50% - ${itemHeight / 2}px)`,
          height: `${itemHeight}px`
        }}
      />
      
      {/* Scrollable container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll scrollbar-hide will-change-scroll"
        style={{
          scrollSnapType: 'y mandatory',
          paddingTop: `${itemHeight * 2}px`,
          paddingBottom: `${itemHeight * 2}px`,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {options.map((option, index) => {
          const isInCenter = index === centerIndex;
          const distance = Math.abs(index - centerIndex);
          const opacity = Math.max(0.35, 1 - distance * 0.25);
          
          return (
            <div
              key={option.value}
              className={`flex items-center justify-center transition-opacity duration-100 cursor-pointer select-none ${
                isInCenter
                  ? 'text-foreground font-medium' 
                  : 'text-muted-foreground font-normal'
              }`}
              style={{ 
                height: `${itemHeight}px`,
                scrollSnapAlign: 'center',
                opacity,
              }}
              onClick={() => {
                onChange(option.value);
                const container = containerRef.current;
                if (container) {
                  container.scrollTop = index * itemHeight;
                }
              }}
            >
              {option.label}
            </div>
          );
        })}
      </div>

      {/* Fade overlays */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-background via-background/70 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-background via-background/70 to-transparent pointer-events-none" />
    </div>
  );
};

export default WheelPicker;
