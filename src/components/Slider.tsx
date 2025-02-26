/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "../lib/utils"

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  variant?: 'default' | 'violet' | 'blue' | 'green';
  showLabels?: boolean;
}

const getVariantStyles = (variant: SliderProps['variant'] = 'default') => {
  const variants = {
    default: {
      track: 'bg-primary/20',
      range: 'bg-primary',
      thumb: 'border-primary/50 bg-background',
      focusRing: 'focus-visible:ring-ring'
    },
    violet: {
      track: 'bg-violet-100',
      range: 'bg-gradient-to-r from-violet-500 to-violet-600',
      thumb: 'border-violet-500 bg-white',
      focusRing: 'focus-visible:ring-violet-500'
    },
    blue: {
      track: 'bg-blue-100',
      range: 'bg-gradient-to-r from-blue-500 to-blue-600',
      thumb: 'border-blue-500 bg-white',
      focusRing: 'focus-visible:ring-blue-500'
    },
    green: {
      track: 'bg-green-100',
      range: 'bg-gradient-to-r from-green-500 to-green-600',
      thumb: 'border-green-500 bg-white',
      focusRing: 'focus-visible:ring-green-500'
    }
  };
  return variants[variant];
};

export const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, variant = 'default', showLabels, ...props }, ref) => {
  const styles = getVariantStyles(variant);
  
  return (
    <div className="relative group touch-none select-none py-2">
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className
        )}
        {...props}
      >
        <SliderPrimitive.Track 
          className={cn(
            "relative h-2 w-full grow overflow-hidden rounded-full transition-all",
            styles.track
          )}
        >
          <SliderPrimitive.Range 
            className={cn(
              "absolute h-full shadow-sm transition-all",
              styles.range,
              "group-hover:shadow-md"
            )}
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb 
          className={cn(
            "block h-5 w-5 rounded-full border-2 shadow-sm",
            styles.thumb,
            styles.focusRing,
            "transition-all duration-200",
            "hover:scale-110 hover:shadow-md",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "group-hover:-mt-0.5 group-hover:mb-0.5"
          )} 
        />
      </SliderPrimitive.Root>
    </div>
  );
})
Slider.displayName = SliderPrimitive.Root.displayName