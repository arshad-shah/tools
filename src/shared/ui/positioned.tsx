import React from 'react';
import { cn } from '@/shared/lib/cn';
import { matrixCss, type OverlayTransform } from './overlay-geometry';

export interface PositionedProps {
  /** CSS px from the parent's left edge (the parent is the positioning box). */
  x: number;
  /** CSS px from the parent's top edge. */
  y: number;
  width?: number;
  height?: number;
  /** Degrees, clockwise. */
  rotate?: number;
  /**
   * Affine matrix applied from the box's top-left corner (e.g. to lay out
   * page-space content in CSS px). Composed after `rotate`; with a matrix
   * both turn about the top-left corner instead of the centre.
   */
  transform?: OverlayTransform;
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

/**
 * Absolute box in the parent's CSS px space: the sanctioned home of
 * data-driven position (spec §4.6). Event props pass through.
 */
export const Positioned = React.forwardRef<
  HTMLDivElement,
  PositionedProps &
    Omit<React.HTMLAttributes<HTMLDivElement>, 'style' | 'children'>
>(
  (
    { x, y, width, height, rotate, transform, className, children, ...rest },
    ref,
  ) => {
    const parts = [
      rotate ? `rotate(${rotate}deg)` : '',
      transform ? matrixCss(transform) : '',
    ].filter(Boolean);
    return (
      <div
        ref={ref}
        className={cn('absolute', className)}
        style={{
          left: x,
          top: y,
          width,
          height,
          transform: parts.length ? parts.join(' ') : undefined,
          transformOrigin: transform ? '0 0' : undefined,
        }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
Positioned.displayName = 'Positioned';

export interface SizedProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'style'
> {
  /** CSS px. */
  width?: number;
  /** CSS px. */
  height?: number;
  /** width / height, used when height is not given. */
  aspect?: number;
}

/** A box with data-driven size (thumbnails, previews sized from a page). */
export const Sized = React.forwardRef<HTMLDivElement, SizedProps>(
  ({ width, height, aspect, className, ...rest }, ref) => (
    <div
      ref={ref}
      className={className}
      style={{
        width,
        height,
        aspectRatio:
          height === undefined && aspect !== undefined ? aspect : undefined,
      }}
      {...rest}
    />
  ),
);
Sized.displayName = 'Sized';
