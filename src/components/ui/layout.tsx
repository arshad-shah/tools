import React from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * Spacing / alignment maps — literal classes so Tailwind can see them
 * ------------------------------------------------------------------ */
const gap = {
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
} as const;
export type Gap = keyof typeof gap;

const align = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
} as const;

const justify = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
} as const;

type Align = keyof typeof align;
type Justify = keyof typeof justify;

/* ------------------------------------------------------------------ *
 * Box — the primitive div
 * ------------------------------------------------------------------ */
export const Box = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={className} {...props} />
));
Box.displayName = 'Box';

/* ------------------------------------------------------------------ *
 * Stack — vertical flex
 * ------------------------------------------------------------------ */
interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: Gap;
  align?: Align;
  justify?: Justify;
}
export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, gap: g = '4', align: a, justify: j, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col',
        gap[g],
        a && align[a],
        j && justify[j],
        className,
      )}
      {...props}
    />
  ),
);
Stack.displayName = 'Stack';

/* ------------------------------------------------------------------ *
 * Inline — horizontal flex
 * ------------------------------------------------------------------ */
interface InlineProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: Gap;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
}
export const Inline = React.forwardRef<HTMLDivElement, InlineProps>(
  (
    {
      className,
      gap: g = '3',
      align: a = 'center',
      justify: j,
      wrap,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-row',
        wrap ? 'flex-wrap' : 'flex-nowrap',
        gap[g],
        align[a],
        j && justify[j],
        className,
      )}
      {...props}
    />
  ),
);
Inline.displayName = 'Inline';

/* ------------------------------------------------------------------ *
 * Grid — responsive columns
 * ------------------------------------------------------------------ */
const cols = {
  1: 'grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'xl:grid-cols-4',
} as const;
interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: Gap;
  /** Ramps up columns at breakpoints: 1 → sm:2 → lg:3 → xl:4, capped at `max`. */
  max?: 1 | 2 | 3 | 4;
}
export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, gap: g = '3', max = 4, ...props }, ref) => {
    const ramp = [cols[1], cols[2], cols[3], cols[4]].slice(0, max);
    return (
      <div
        ref={ref}
        className={cn('grid', ...ramp, gap[g], className)}
        {...props}
      />
    );
  },
);
Grid.displayName = 'Grid';

/* ------------------------------------------------------------------ *
 * Container — centered max-width
 * ------------------------------------------------------------------ */
const containerSize = {
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
} as const;
interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: keyof typeof containerSize;
}
export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = 'xl', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'mx-auto w-full px-4 sm:px-6',
        containerSize[size],
        className,
      )}
      {...props}
    />
  ),
);
Container.displayName = 'Container';

/* ------------------------------------------------------------------ *
 * Section — vertical rhythm wrapper
 * ------------------------------------------------------------------ */
interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'section' | 'header' | 'footer' | 'main' | 'div';
}
export const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, as: Tag = 'section', ...props }, ref) => {
    const Comp = Tag as React.ElementType;
    return <Comp ref={ref} className={cn('py-8', className)} {...props} />;
  },
);
Section.displayName = 'Section';

/* ------------------------------------------------------------------ *
 * Center — flex center, optional full-screen
 * ------------------------------------------------------------------ */
interface CenterProps extends React.HTMLAttributes<HTMLDivElement> {
  minScreen?: boolean;
}
export const Center = React.forwardRef<HTMLDivElement, CenterProps>(
  ({ className, minScreen, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-center',
        minScreen && 'min-h-screen',
        className,
      )}
      {...props}
    />
  ),
);
Center.displayName = 'Center';

/* ------------------------------------------------------------------ *
 * Divider — hairline rule
 * ------------------------------------------------------------------ */
export const Divider: React.FC<{ className?: string }> = ({ className }) => (
  <hr className={cn('border-0 border-t border-line', className)} />
);
Divider.displayName = 'Divider';
