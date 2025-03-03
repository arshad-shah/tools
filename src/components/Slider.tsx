"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "../lib/utils"

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  variant?: 'default' | 'violet' | 'blue' | 'green' | 'red' | 'alpha';
  showLabels?: boolean;
  showTooltip?: boolean;
  showTickMarks?: boolean;
  tickMarks?: number[];
  unit?: string;
}

const getVariantStyles = (variant: SliderProps['variant'] = 'default') => {
  const variants = {
    default: {
      track: 'bg-primary/20',
      range: 'bg-primary',
      thumb: 'border-primary/50 bg-background',
      focusRing: 'focus-visible:ring-ring',
      tooltip: 'bg-primary text-primary-foreground',
      tickMark: 'bg-primary/40'
    },
    violet: {
      track: 'bg-violet-100 dark:bg-violet-950/30',
      range: 'bg-gradient-to-r from-violet-500 to-violet-600',
      thumb: 'border-violet-500 bg-white dark:bg-gray-950',
      focusRing: 'focus-visible:ring-violet-500',
      tooltip: 'bg-violet-600 text-white',
      tickMark: 'bg-violet-400'
    },
    blue: {
      track: 'bg-blue-100 dark:bg-blue-950/30',
      range: 'bg-gradient-to-r from-blue-500 to-blue-600',
      thumb: 'border-blue-500 bg-white dark:bg-gray-950',
      focusRing: 'focus-visible:ring-blue-500',
      tooltip: 'bg-blue-600 text-white',
      tickMark: 'bg-blue-400'
    },
    green: {
      track: 'bg-green-100 dark:bg-green-950/30',
      range: 'bg-gradient-to-r from-green-500 to-green-600',
      thumb: 'border-green-500 bg-white dark:bg-gray-950',
      focusRing: 'focus-visible:ring-green-500',
      tooltip: 'bg-green-600 text-white',
      tickMark: 'bg-green-400'
    },
    red: {
      track: 'bg-red-100 dark:bg-red-950/30',
      range: 'bg-gradient-to-r from-red-500 to-red-600',
      thumb: 'border-red-500 bg-white dark:bg-gray-950',
      focusRing: 'focus-visible:ring-red-500',
      tooltip: 'bg-red-600 text-white',
      tickMark: 'bg-red-400'
    },
    alpha: {
      track: 'bg-neutral-200 dark:bg-neutral-700 backdrop-blur-sm',
      range: 'bg-gradient-to-r from-transparent to-primary/90',
      thumb: 'border-2 border-primary/70 bg-white dark:bg-gray-900',
      focusRing: 'focus-visible:ring-primary/40',
      tooltip: 'bg-primary/90 text-white backdrop-blur-md',
      tickMark: 'bg-primary/50'
    },
  };
  return variants[variant];
};

export const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ 
  className, 
  variant = 'default', 
  showLabels, 
  showTooltip = false,
  showTickMarks = false,
  tickMarks,
  unit = '',
  min = 0,
  max = 100,
  step = 1,
  ...props 
}, ref) => {
  const styles = getVariantStyles(variant);
  const [hoveredValue, setHoveredValue] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const trackRef = React.useRef<HTMLDivElement>(null);
  
  // Generate tick marks based on min, max, step if no explicit tickMarks provided
  const calculatedTickMarks = React.useMemo(() => {
    if (tickMarks) return tickMarks;
    
    // Only generate default ticks if showing tick marks and step is reasonable
    if (!showTickMarks) return [];
    if ((max - min) / step > 20) {
      // Too many potential ticks, generate 5 evenly spaced ones
      const ticks = [];
      for (let i = 0; i <= 4; i++) {
        ticks.push(min + ((max - min) / 4) * i);
      }
      return ticks;
    }
    
    const ticks = [];
    for (let i = min; i <= max; i += step) {
      ticks.push(i);
    }
    return ticks;
  }, [min, max, step, tickMarks, showTickMarks]);
  
  // Handle mouse hover to show value tooltip
  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (!trackRef.current || !showTooltip) return;
      
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      const rawValue = min + percent * (max - min);
      
      // Snap to nearest step
      const value = Math.round(rawValue / step) * step;
      setHoveredValue(value);
    },
    [min, max, step, showTooltip]
  );
  
  // Update tooltip on value changes
  React.useEffect(() => {
    if (!showTooltip || !props.value) return;
    
    // For controlled component, show the actual value in tooltip when dragging
    if (isDragging && Array.isArray(props.value)) {
      setHoveredValue(props.value[0]);
    }
  }, [props.value, isDragging, showTooltip]);
  
  // Format a number value for display
  const formatValue = (value: number) => {
    return value % 1 === 0 ? value : value.toFixed(2);
  };
  
  return (
    <div className="space-y-1 touch-none select-none py-3">
      {/* Labels row */}
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground px-1.5">
          <span>{formatValue(min)}{unit}</span>
          <span>{formatValue(max)}{unit}</span>
        </div>
      )}
      
      {/* Slider container */}
      <div 
        className="relative group"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredValue(null)}
        ref={trackRef}
      >
        <SliderPrimitive.Root
          ref={ref}
          min={min}
          max={max}
          step={step}
          className={cn(
            "relative flex w-full touch-none select-none items-center",
            className
          )}
          onPointerDown={() => setIsDragging(true)}
          onPointerUp={() => setIsDragging(false)}
          {...props}
        >
          {/* Tick marks */}
          {showTickMarks && (
            <div className="absolute inset-0 flex items-center justify-between pointer-events-none">
              {calculatedTickMarks.map((tick, i) => {
                const percent = ((tick - min) / (max - min)) * 100;
                return (
                  <div 
                    key={i}
                    className={cn(
                      "absolute h-1.5 w-0.5 rounded-full transition-all duration-300 ease-out",
                      styles.tickMark,
                      "opacity-50 group-hover:opacity-100 group-hover:h-2"
                    )}
                    style={{ left: `${percent}%` }}
                  />
                );
              })}
            </div>
          )}
          
          <SliderPrimitive.Track 
            className={cn(
              "relative h-2 w-full grow overflow-hidden rounded-full transition-all duration-200",
              styles.track,
              "shadow-sm group-hover:shadow-md",
              "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:opacity-0 before:translate-x-full group-hover:before:animate-shine"
            )}
          >
            <SliderPrimitive.Range 
              className={cn(
                "absolute h-full transition-all duration-200 ease-out",
                styles.range,
                "shadow-inner group-hover:shadow-md",
                "after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:opacity-0 group-hover:after:opacity-100 group-active:after:opacity-0 after:transition-opacity after:duration-1000"
              )}
            />
          </SliderPrimitive.Track>
          
          <SliderPrimitive.Thumb 
            className={cn(
              "block h-5 w-5 rounded-full border-2 shadow-md",
              styles.thumb,
              styles.focusRing,
              "transition-all duration-150 ease-out",
              "hover:scale-110 active:scale-105",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              "z-10",
              "group-active:shadow-lg",
              "before:absolute before:inset-0 before:rounded-full before:opacity-0 before:bg-white/20 before:transition-opacity group-hover:before:opacity-100 group-active:before:opacity-0"
            )} 
          />
        </SliderPrimitive.Root>
        
        {/* Value tooltip */}
        {showTooltip && hoveredValue !== null && (
          <div 
            className={cn(
              "absolute -top-8 px-2 py-1 rounded text-xs font-medium shadow-md",
              styles.tooltip,
              "transform -translate-x-1/2 transition-all duration-75",
              "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100", 
              isDragging ? "opacity-100 scale-100" : "",
              "after:content-[''] after:absolute after:left-1/2 after:top-full after:transform after:-translate-x-1/2 after:border-4 after:border-transparent",
              `after:border-t-[var(--tooltip-color)]`
            )}
            style={{ 
              left: `${((hoveredValue - min) / (max - min)) * 100}%`,
              "--tooltip-color": variant === 'default' 
                ? 'hsl(var(--primary))' 
                : `var(--${variant}-tooltip-color, var(--tooltip-color, #333))` 
            } as React.CSSProperties}
          >
            {formatValue(hoveredValue)}{unit}
          </div>
        )}
      </div>
      
      {/* Value labels if needed */}
      {props.value && showLabels && Array.isArray(props.value) && (
        <div className="text-sm font-medium text-center transition-opacity duration-200">
          Current: {formatValue(props.value[0])}{unit}
        </div>
      )}
    </div>
  );
});

Slider.displayName = SliderPrimitive.Root.displayName