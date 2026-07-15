import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium leading-none',
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
        xs: 'px-1.5 py-0.5 text-[0.6rem]',
        sm: 'px-2 py-1 text-[0.65rem]',
        md: 'px-2.5 py-1 text-xs',
      },
      pill: { true: 'rounded-full', false: 'rounded-md' },
    },
    compoundVariants: [
      // solid
      { variant: 'solid', tone: 'accent', class: 'bg-accent text-accent-ink' },
      { variant: 'solid', tone: 'neutral', class: 'bg-surface-strong text-fg' },
      { variant: 'solid', tone: 'success', class: 'bg-success text-canvas' },
      { variant: 'solid', tone: 'warning', class: 'bg-warning text-canvas' },
      { variant: 'solid', tone: 'danger', class: 'bg-danger text-canvas' },
      { variant: 'solid', tone: 'info', class: 'bg-info text-canvas' },
      // soft
      { variant: 'soft', tone: 'accent', class: 'bg-accent/15 text-accent' },
      {
        variant: 'soft',
        tone: 'neutral',
        class: 'bg-surface-subtle text-fg-muted',
      },
      { variant: 'soft', tone: 'success', class: 'bg-success/15 text-success' },
      { variant: 'soft', tone: 'warning', class: 'bg-warning/15 text-warning' },
      { variant: 'soft', tone: 'danger', class: 'bg-danger/15 text-danger' },
      { variant: 'soft', tone: 'info', class: 'bg-info/15 text-info' },
      // outline
      {
        variant: 'outline',
        tone: 'accent',
        class: 'border border-accent/40 text-accent',
      },
      {
        variant: 'outline',
        tone: 'neutral',
        class: 'border border-line-strong text-fg-subtle',
      },
      {
        variant: 'outline',
        tone: 'success',
        class: 'border border-success/40 text-success',
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
}
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, tone, size, pill, mono, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        badgeVariants({ variant, tone, size, pill }),
        mono && 'font-mono',
        className,
      )}
      {...props}
    />
  ),
);
Badge.displayName = 'Badge';
