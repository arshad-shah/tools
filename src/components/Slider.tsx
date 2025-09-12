"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "../lib/utils"

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  variant?: 'default' | 'violet' | 'blue' | 'green' | 'red' | 'alpha' | 'orange';
  showLabels?: boolean;
  showTooltip?: boolean;
  showTickMarks?: boolean;
  tickMarks?: number[];
  unit?: string;
}

const getVariantStyles = (variant: SliderProps['variant'] = 'default') => {
  const variants = {
    default: {
      track: 'bg-gray-200 dark:bg-gray-700',
      range: 'bg-indigo-600 dark:bg-indigo-500',
      thumb: 'border-2 border-indigo-600 bg-white dark:bg-gray-900 dark:border-indigo-500',
      focusRing: 'focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400',
      tooltip: 'bg-indigo-600 text-white dark:bg-indigo-500',
      tickMark: 'bg-indigo-400 dark:bg-indigo-500'
    },
    violet: {
      track: 'bg-violet-100 dark:bg-violet-900/20',
      range: 'bg-violet-600 dark:bg-violet-500',
      thumb: 'border-2 border-violet-600 bg-white dark:bg-gray-900 dark:border-violet-500',
      focusRing: 'focus-visible:ring-violet-500 dark:focus-visible:ring-violet-400',
      tooltip: 'bg-violet-600 text-white dark:bg-violet-500',
      tickMark: 'bg-violet-400 dark:bg-violet-500'
    },
    blue: {
      track: 'bg-blue-100 dark:bg-blue-900/20',
      range: 'bg-blue-600 dark:bg-blue-500',
      thumb: 'border-2 border-blue-600 bg-white dark:bg-gray-900 dark:border-blue-500',
      focusRing: 'focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400',
      tooltip: 'bg-blue-600 text-white dark:bg-blue-500',
      tickMark: 'bg-blue-400 dark:bg-blue-500'
    },
    green: {
      track: 'bg-green-100 dark:bg-green-900/20',
      range: 'bg-green-600 dark:bg-green-500',
      thumb: 'border-2 border-green-600 bg-white dark:bg-gray-900 dark:border-green-500',
      focusRing: 'focus-visible:ring-green-500 dark:focus-visible:ring-green-400',
      tooltip: 'bg-green-600 text-white dark:bg-green-500',
      tickMark: 'bg-green-400 dark:bg-green-500'
    },
    red: {
      track: 'bg-red-100 dark:bg-red-900/20',
      range: 'bg-red-600 dark:bg-red-500',
      thumb: 'border-2 border-red-600 bg-white dark:bg-gray-900 dark:border-red-500',
      focusRing: 'focus-visible:ring-red-500 dark:focus-visible:ring-red-400',
      tooltip: 'bg-red-600 text-white dark:bg-red-500',
      tickMark: 'bg-red-400 dark:bg-red-500'
    },
    orange: {
      track: 'bg-orange-100 dark:bg-orange-900/20',
      range: 'bg-orange-600 dark:bg-orange-500',
      thumb: 'border-2 border-orange-600 bg-white dark:bg-gray-900 dark:border-orange-500',
      focusRing: 'focus-visible:ring-orange-500 dark:focus-visible:ring-orange-400',
      tooltip: 'bg-orange-600 text-white dark:bg-orange-500',
      tickMark: 'bg-orange-400 dark:bg-orange-500'
    },
    alpha: {
      track: 'bg-gray-200/60 dark:bg-gray-700/60 backdrop-blur-sm',
      range: 'bg-gradient-to-r from-transparent to-gray-900/80 dark:from-transparent dark:to-gray-100/80',
      thumb: 'border-2 border-gray-600 bg-white dark:bg-gray-900 dark:border-gray-400',
      focusRing: 'focus-visible:ring-gray-500 dark:focus-visible:ring-gray-400',
      tooltip: 'bg-gray-800/90 text-white backdrop-blur-sm dark:bg-gray-100/90 dark:text-black',
      tickMark: 'bg-gray-500 dark:bg-gray-400'
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
  showLabels = false, 
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
  const [isHovering, setIsHovering] = React.useState(false);
  const trackRef = React.useRef<HTMLDivElement>(null);
  
  // Generate tick marks based on min, max, step if no explicit tickMarks provided
  const calculatedTickMarks = React.useMemo(() => {
    if (tickMarks) return tickMarks;
    if (!showTickMarks) return [];
    
    const range = max - min;
    const stepCount = range / step;
    
    // Smart tick generation based on range
    if (stepCount <= 10) {
      // Show all steps if 10 or fewer
      const ticks = [];
      for (let i = min; i <= max; i += step) {
        ticks.push(Number(i.toFixed(10))); // Avoid floating point precision issues
      }
      return ticks;
    } else if (stepCount <= 50) {
      // Show every 5th step for medium ranges
      const interval = Math.ceil(stepCount / 10) * step;
      const ticks = [];
      for (let i = min; i <= max; i += interval) {
        ticks.push(Number(i.toFixed(10)));
      }
      if (!ticks.includes(max)) ticks.push(max);
      return ticks;
    } else {
      // Show 5 evenly distributed ticks for large ranges
      const ticks = [];
      for (let i = 0; i <= 4; i++) {
        const value = min + (range / 4) * i;
        ticks.push(Number(value.toFixed(10)));
      }
      return ticks;
    }
  }, [min, max, step, tickMarks, showTickMarks]);
  
  // Handle mouse movement for tooltip
  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (!trackRef.current || !showTooltip) return;
      
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      const rawValue = min + percent * (max - min);
      
      // Snap to nearest step
      const steppedValue = Math.round(rawValue / step) * step;
      const clampedValue = Math.min(Math.max(steppedValue, min), max);
      
      setHoveredValue(Number(clampedValue.toFixed(10)));
    },
    [min, max, step, showTooltip]
  );
  
  // Format value for display
  const formatValue = React.useCallback((value: number) => {
    if (value % 1 === 0) return value.toString();
    
    // Smart decimal formatting
    const decimals = step < 1 ? Math.max(0, -Math.floor(Math.log10(step))) : 0;
    return value.toFixed(decimals);
  }, [step]);
  
  // Get current value for display
  const getCurrentValue = () => {
    if (isDragging && hoveredValue !== null) return hoveredValue;
    if (props.value && Array.isArray(props.value)) return props.value[0];
    if (props.defaultValue && Array.isArray(props.defaultValue)) return props.defaultValue[0];
    return min;
  };
  
  const currentValue = getCurrentValue();
  
  return (
    <div className="w-full space-y-2">
      {/* Top labels */}
      {showLabels && (
        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 px-1">
          <span className="font-medium">{formatValue(min)}{unit}</span>
          <span className="font-medium">{formatValue(max)}{unit}</span>
        </div>
      )}
      
      {/* Slider container */}
      <div 
        className="relative py-2"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          setHoveredValue(null);
        }}
        onMouseMove={handleMouseMove}
        ref={trackRef}
      >
        <SliderPrimitive.Root
          ref={ref}
          min={min}
          max={max}
          step={step}
          className={cn(
            "relative flex w-full touch-none select-none items-center group",
            className
          )}
          onPointerDown={() => setIsDragging(true)}
          onPointerUp={() => setIsDragging(false)}
          {...props}
        >
          {/* Track */}
          <SliderPrimitive.Track 
            className={cn(
              "relative h-2.5 w-full overflow-hidden rounded-full transition-all duration-200 ease-out",
              styles.track,
              "shadow-inner",
              isHovering && "h-3"
            )}
          >
            {/* Range (filled portion) */}
            <SliderPrimitive.Range 
              className={cn(
                "absolute h-full transition-all duration-200 ease-out rounded-full",
                styles.range,
                "shadow-sm"
              )}
            />
            
            {/* Tick marks */}
            {showTickMarks && calculatedTickMarks.map((tick, index) => {
              const percent = ((tick - min) / (max - min)) * 100;
              const isInRange = tick <= currentValue;
              
              return (
                <div
                  key={`${tick}-${index}`}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-0.5 rounded-full transition-all duration-200",
                    isInRange 
                      ? "bg-white/80 h-1.5" 
                      : `h-1 ${styles.tickMark}`,
                    isHovering && (isInRange ? "h-2" : "h-1.5")
                  )}
                  style={{ left: `${percent}%` }}
                />
              );
            })}
          </SliderPrimitive.Track>
          
          {/* Thumb */}
          <SliderPrimitive.Thumb 
            className={cn(
              "block h-5 w-5 rounded-full shadow-lg transition-all duration-200 ease-out",
              styles.thumb,
              styles.focusRing,
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              "hover:scale-110 focus-visible:scale-110",
              "active:scale-105",
              "disabled:pointer-events-none disabled:opacity-50",
              isDragging && "scale-110 shadow-xl",
              "cursor-pointer"
            )} 
          />
        </SliderPrimitive.Root>
        
        {/* Tooltip */}
        {showTooltip && (hoveredValue !== null || isDragging) && (
          <div 
            className={cn(
              "absolute -top-10 px-2.5 py-1.5 rounded-md text-xs font-semibold shadow-lg transition-all duration-150 ease-out z-10",
              styles.tooltip,
              "transform -translate-x-1/2",
              "opacity-0 scale-95 translate-y-1",
              (isHovering || isDragging) && "opacity-100 scale-100 translate-y-0",
              // Tooltip arrow
              "after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2",
              "after:border-4 after:border-transparent after:border-t-current"
            )}
            style={{ 
              left: `${((hoveredValue ?? currentValue) - min) / (max - min) * 100}%`
            }}
          >
            {formatValue(hoveredValue ?? currentValue)}{unit}
          </div>
        )}
      </div>
      
      {/* Current value display */}
      {showLabels && (
        <div className="text-center">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {formatValue(currentValue)}{unit}
          </span>
        </div>
      )}
    </div>
  );
});

Slider.displayName = SliderPrimitive.Root.displayName;