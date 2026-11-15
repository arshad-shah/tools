import React from 'react';
import { Grid } from '@arshad-shah/cynosure';
import type { Gap } from './layout';

/** Tools gap steps (Tailwind 4px units) as Cynosure space tokens, same px. */
const CY_SPACE = {
  '0': '0',
  '1': '2',
  '2': '4',
  '3': '5',
  '4': '6',
  '5': '7',
  '6': '8',
  '8': '9',
  '10': '10',
  // 48px has no Cynosure step; 40px is the largest.
  '12': '10',
} as const satisfies Record<Gap, string>;

export interface AutoGridProps {
  /** Minimum column width in px. */
  min: number;
  gap?: Gap;
  as?: 'div' | 'ul';
  'aria-label'?: string;
  /** Layout only. */
  className?: string;
  children: React.ReactNode;
}

/** Responsive grid: as many columns of at least `min` px as fit (Cynosure `Grid`). */
export const AutoGrid = React.forwardRef<HTMLElement, AutoGridProps>(
  ({ min, gap = '4', as = 'div', className, children, ...rest }, ref) => (
    <Grid
      ref={ref}
      as={as}
      minItemWidth={`${min}px`}
      gap={CY_SPACE[gap]}
      className={className}
      {...rest}
    >
      {children}
    </Grid>
  ),
);
AutoGrid.displayName = 'AutoGrid';
