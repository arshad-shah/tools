import React from 'react';
import { cn } from '@/shared/lib/cn';
import type { Gap } from './layout';

const GAP: Record<Gap, string> = {
  '0': 'gap-0',
  '1': 'gap-1',
  '2': 'gap-2',
  '3': 'gap-3',
  '4': 'gap-4',
  '5': 'gap-5',
  '6': 'gap-6',
  '8': 'gap-8',
  '10': 'gap-10',
  '12': 'gap-12',
};

export interface AutoGridProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  'style'
> {
  /** Minimum column width in px. */
  min: number;
  gap?: Gap;
  as?: 'div' | 'ul';
  className?: string;
  children: React.ReactNode;
}

/** Responsive grid: as many columns of at least `min` px as fit. */
export const AutoGrid = React.forwardRef<HTMLElement, AutoGridProps>(
  ({ min, gap = '4', as = 'div', className, children, ...rest }, ref) => {
    const Tag = as as 'div';
    return (
      <Tag
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn('grid', GAP[gap], as === 'ul' && 'list-none', className)}
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))`,
        }}
        {...rest}
      >
        {children}
      </Tag>
    );
  },
);
AutoGrid.displayName = 'AutoGrid';
