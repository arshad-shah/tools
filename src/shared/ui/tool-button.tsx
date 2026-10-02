import React from 'react';
import { cn } from '@/shared/lib/cn';
import { buttonVariants } from './button-variants';
import type { IconComponent } from './icons';

/**
 * none: icon only. responsive: the text shows from md up (desktop), icon
 * only below (phones). always: icon and text at every width.
 */
export type ToolLabels = 'none' | 'responsive' | 'always';

export interface ToolButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  /** Accessible name (also the tooltip). */
  label: string;
  /** Visible text when labelled; defaults to `label`. */
  text?: string;
  icon: IconComponent;
  labels: Exclude<ToolLabels, 'none'>;
  /** sm: 32px (Standard). lg: 44px touch targets (Focus, phone). */
  size?: 'sm' | 'md' | 'lg';
}

const HEIGHT = {
  sm: 'h-8 min-w-8',
  md: 'h-9 min-w-9',
  lg: 'h-touch min-w-touch',
};
const PAD = {
  responsive: { sm: 'px-0 md:px-2.5', md: 'px-0 md:px-3', lg: 'px-0 md:px-3' },
  always: { sm: 'px-2.5', md: 'px-3', lg: 'px-3' },
};
const ICON = { sm: 'sm', md: 'md', lg: 'lg' } as const;

/**
 * A ghost toolbar button with an icon and a text label (the labelled form
 * of IconButton, spec owner note: labels beside icons on desktop). The
 * accessible name stays `label` at every width.
 */
export const ToolButton = React.forwardRef<HTMLButtonElement, ToolButtonProps>(
  (
    { label, text, icon: Icon, labels, size = 'sm', className, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        buttonVariants({ variant: 'ghost', size }),
        'gap-1.5',
        HEIGHT[size],
        PAD[labels][size],
        className,
      )}
      {...props}
    >
      <Icon size={ICON[size]} />
      <span
        className={cn(
          'text-sm',
          labels === 'responsive' ? 'hidden md:inline' : 'inline',
        )}
      >
        {text ?? label}
      </span>
    </button>
  ),
);
ToolButton.displayName = 'ToolButton';
