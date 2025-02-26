"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "../lib/utils"

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  variant?: 'default' | 'violet' | 'blue' | 'green';
  size?: 'sm' | 'md' | 'lg';
}

const getVariantStyles = (variant: SwitchProps['variant'] = 'default') => {
  const variants = {
    default: {
      base: 'shadow-lg backdrop-blur-sm bg-opacity-20',
      checked: [
        'data-[state=checked]:bg-slate-700',
        'data-[state=checked]:before:absolute data-[state=checked]:before:inset-0',
        'data-[state=checked]:before:rounded-full data-[state=checked]:before:bg-gradient-to-r',
        'data-[state=checked]:before:from-slate-400/20 data-[state=checked]:before:to-transparent',
      ].join(' '),
      unchecked: 'data-[state=unchecked]:bg-transparent data-[state=unchecked]:border-slate-500',
      hover: 'hover:data-[state=checked]:shadow-slate-500/30 hover:shadow-xl',
      focusRing: 'focus-visible:ring-slate-400',
      thumbChecked: 'data-[state=checked]:bg-white',
      thumbUnchecked: 'data-[state=unchecked]:bg-slate-500'
    },
    violet: {
      base: 'shadow-lg backdrop-blur-sm bg-opacity-20',
      checked: [
        'data-[state=checked]:bg-violet-500',
        'data-[state=checked]:before:absolute data-[state=checked]:before:inset-0',
        'data-[state=checked]:before:rounded-full data-[state=checked]:before:bg-gradient-to-r',
        'data-[state=checked]:before:from-white/20 data-[state=checked]:before:to-transparent',
      ].join(' '),
      unchecked: 'data-[state=unchecked]:bg-transparent data-[state=unchecked]:border-violet-500',
      hover: 'hover:data-[state=checked]:shadow-violet-500/30 hover:shadow-xl',
      focusRing: 'focus-visible:ring-violet-400',
      thumbChecked: 'data-[state=checked]:bg-white',
      thumbUnchecked: 'data-[state=unchecked]:bg-violet-500'
    },
    blue: {
      base: 'shadow-lg backdrop-blur-sm bg-opacity-20',
      checked: [
        'data-[state=checked]:bg-blue-500',
        'data-[state=checked]:before:absolute data-[state=checked]:before:inset-0',
        'data-[state=checked]:before:rounded-full data-[state=checked]:before:bg-gradient-to-r',
        'data-[state=checked]:before:from-white/20 data-[state=checked]:before:to-transparent',
      ].join(' '),
      unchecked: 'data-[state=unchecked]:bg-transparent data-[state=unchecked]:border-blue-500',
      hover: 'hover:data-[state=checked]:shadow-blue-500/30 hover:shadow-xl',
      focusRing: 'focus-visible:ring-blue-400',
      thumbChecked: 'data-[state=checked]:bg-white',
      thumbUnchecked: 'data-[state=unchecked]:bg-blue-500'
    },
    green: {
      base: 'shadow-lg backdrop-blur-sm bg-opacity-20',
      checked: [
        'data-[state=checked]:bg-emerald-500',
        'data-[state=checked]:before:absolute data-[state=checked]:before:inset-0',
        'data-[state=checked]:before:rounded-full data-[state=checked]:before:bg-gradient-to-r',
        'data-[state=checked]:before:from-white/20 data-[state=checked]:before:to-transparent',
      ].join(' '),
      unchecked: 'data-[state=unchecked]:bg-transparent data-[state=unchecked]:border-emerald-500',
      hover: 'hover:data-[state=checked]:shadow-emerald-500/30 hover:shadow-xl',
      focusRing: 'focus-visible:ring-emerald-400',
      thumbChecked: 'data-[state=checked]:bg-white',
      thumbUnchecked: 'data-[state=unchecked]:bg-emerald-500'
    }
  };
  return variants[variant];
};

const getSizeStyles = (size: SwitchProps['size'] = 'md') => {
  const sizes = {
    sm: {
      root: 'h-5 w-9',
      thumb: [
        'h-4 w-4',
        'data-[state=checked]:translate-x-4',
        'after:h-4 after:w-4'
      ].join(' '),
    },
    md: {
      root: 'h-7 w-12',
      thumb: [
        'h-6 w-6',
        'data-[state=checked]:translate-x-5',
        'after:h-6 after:w-6'
      ].join(' '),
    },
    lg: {
      root: 'h-8 w-14',
      thumb: [
        'h-7 w-7',
        'data-[state=checked]:translate-x-6',
        'after:h-7 after:w-7'
      ].join(' '),
    },
  };
  return sizes[size];
};

export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, variant = 'default', size = 'md', ...props }, ref) => {
  const styles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);
  
  return (
    <SwitchPrimitives.Root
      className={cn(
        // Base styles
        "peer relative inline-flex shrink-0 cursor-pointer items-center rounded-full",
        "border-2 border-transparent overflow-hidden",
        
        // Transitions
        "transition-all duration-300 ease-spring",
        
        // States
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        
        // Hover effects
        "hover:shadow-lg hover:scale-105",
        "active:scale-95",
        
        // Custom styles
        styles.base,
        styles.checked,
        styles.unchecked,
        styles.hover,
        styles.focusRing,
        sizeStyles.root,
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          // Base styles
          "pointer-events-none block rounded-full",
          "shadow-lg ring-0",
          
          // Transitions
          "transition-all duration-300 ease-spring",
          
          "data-[state=unchecked]:translate-x-0",
          
          // After element for shine effect
          "after:absolute after:top-0 after:left-0",
          "after:rounded-full after:opacity-0",
          "after:transition-opacity after:duration-200",
          "after:bg-gradient-to-br after:from-white/80 after:to-transparent",
          "data-[state=checked]:after:opacity-100",
          
          // Custom styles
          styles.thumbChecked,
          styles.thumbUnchecked,
          sizeStyles.thumb,
          
          // Hover effects
          "group-hover/switch:shadow-lg"
        )}
      />
    </SwitchPrimitives.Root>
  )
})
Switch.displayName = SwitchPrimitives.Root.displayName