import React from 'react';
import { cn } from '@/shared/lib/cn';
import { Button } from './button';
import type { IconComponent } from './icons';

/**
 * none: icon only. responsive: the text shows from md up (desktop), icon
 * only below (phones). always: icon and text at every width.
 */
export type ToolLabels = 'none' | 'responsive' | 'always';

export interface ToolButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'color' | 'type' | 'children'
> {
  /** Accessible name (also the tooltip). */
  label: string;
  /** Visible text when labelled; defaults to `label`. */
  text?: string;
  icon: IconComponent;
  labels: Exclude<ToolLabels, 'none'>;
  /** sm: Standard. lg: touch targets (Focus, phone). */
  size?: 'sm' | 'md' | 'lg';
}

/** responsive: icon only (no padding, square) below md, Cynosure's padding from md. */
const RESPONSIVE = {
  sm: 'min-w-(--cy-control-height-sm) [--cy-button-padding-inline:0] md:[--cy-button-padding-inline:var(--cy-space-4)]',
  md: 'min-w-(--cy-control-height-md) [--cy-button-padding-inline:0] md:[--cy-button-padding-inline:var(--cy-space-5)]',
  lg: 'min-w-(--cy-control-height-lg) [--cy-button-padding-inline:0] md:[--cy-button-padding-inline:var(--cy-space-5)]',
};
const ICON = { sm: 'sm', md: 'md', lg: 'lg' } as const;

/**
 * A ghost toolbar button with an icon and a text label (the labelled form
 * of IconButton, spec owner note: labels beside icons on desktop), on
 * Cynosure's Button (through the Button facade). The accessible name stays `label` at every width.
 */
export const ToolButton = React.forwardRef<HTMLButtonElement, ToolButtonProps>(
  (
    { label, text, icon: Icon, labels, size = 'sm', className, ...props },
    ref,
  ) => (
    <Button
      ref={ref}
      {...props}
      variant="ghost"
      size={size}
      aria-label={label}
      className={cn(labels === 'responsive' && RESPONSIVE[size], className)}
      leftIcon={<Icon size={ICON[size]} />}
    >
      <span
        className={labels === 'responsive' ? 'hidden md:inline' : undefined}
      >
        {text ?? label}
      </span>
    </Button>
  ),
);
ToolButton.displayName = 'ToolButton';
