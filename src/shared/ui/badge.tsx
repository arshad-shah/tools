import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-mono-meta leading-none',
  {
    variants: {
      variant: {
        solid: '',
        soft: '',
        outline: 'bg-transparent',
      },
      tone: {
        accent: '',
        neutral: '',
        success: '',
        warning: '',
        danger: '',
        info: '',
      },
      size: {
        xs: 'px-1.5 py-0.5 text-xs',
        sm: 'px-1.5 py-1 text-xs',
        md: 'px-2.5 py-1 text-xs',
      },
      pill: { true: 'rounded-full', false: 'rounded-sm' },
    },
    compoundVariants: [
      // solid
      { variant: 'solid', tone: 'accent', class: 'bg-accent text-accent-ink' },
      { variant: 'solid', tone: 'neutral', class: 'bg-surface-3 text-fg' },
      { variant: 'solid', tone: 'success', class: 'bg-accent text-accent-ink' },
      { variant: 'solid', tone: 'warning', class: 'bg-warning text-canvas' },
      { variant: 'solid', tone: 'danger', class: 'bg-danger text-canvas' },
      { variant: 'solid', tone: 'info', class: 'bg-info text-canvas' },
      // soft
      {
        variant: 'soft',
        tone: 'accent',
        class: 'bg-accent-soft text-accent-fg',
      },
      {
        variant: 'soft',
        tone: 'neutral',
        class: 'bg-surface-2 text-fg-muted',
      },
      {
        variant: 'soft',
        tone: 'success',
        class: 'bg-accent-soft text-accent-fg',
      },
      {
        variant: 'soft',
        tone: 'warning',
        class: 'bg-warning-soft text-warning',
      },
      { variant: 'soft', tone: 'danger', class: 'bg-danger-soft text-danger' },
      { variant: 'soft', tone: 'info', class: 'bg-info-soft text-info' },
      // outline
      {
        variant: 'outline',
        tone: 'accent',
        class: 'border border-accent-fg/40 text-accent-fg',
      },
      {
        variant: 'outline',
        tone: 'neutral',
        class: 'border border-line-strong text-fg-subtle',
      },
      {
        variant: 'outline',
        tone: 'success',
        class: 'border border-accent-fg/40 text-accent-fg',
      },
      {
        variant: 'outline',
        tone: 'warning',
        class: 'border border-warning/40 text-warning',
      },
      {
        variant: 'outline',
        tone: 'danger',
        class: 'border border-danger/40 text-danger',
      },
      {
        variant: 'outline',
        tone: 'info',
        class: 'border border-info/40 text-info',
      },
    ],
    defaultVariants: {
      variant: 'soft',
      tone: 'neutral',
      size: 'md',
      pill: false,
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  mono?: boolean;
  /** Leading icon, rendered before the label with the built-in gap. */
  icon?: React.ReactNode;
}
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, variant, tone, size, pill, mono, icon, children, ...props },
    ref,
  ) => (
    <span
      ref={ref}
      className={cn(
        badgeVariants({ variant, tone, size, pill }),
        mono && 'font-mono-meta',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  ),
);
Badge.displayName = 'Badge';
