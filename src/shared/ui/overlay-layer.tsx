import type React from 'react';
import { cn } from '@/shared/lib/cn';
import { Positioned } from './positioned';
import {
  mapBox,
  type OverlayTransform,
  type PageSpaceBox,
} from './overlay-geometry';

export type { OverlayTransform, PageSpaceBox } from './overlay-geometry';

export interface OverlayLayerProps {
  /** CSS px of the page slot it fills. */
  width: number;
  height: number;
  label?: string;
  /** false (default): pointer events pass through to the page below. */
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

/**
 * Absolutely fills its page slot; the only sanctioned home of data-driven
 * overlay geometry (spec §4.6).
 */
export function OverlayLayer({
  width,
  height,
  label,
  interactive = false,
  className,
  children,
  'data-testid': testId,
}: OverlayLayerProps) {
  return (
    <Positioned
      x={0}
      y={0}
      width={width}
      height={height}
      role={label ? 'group' : undefined}
      aria-label={label}
      data-testid={testId}
      className={cn(
        'overflow-hidden',
        !interactive && 'pointer-events-none',
        className,
      )}
    >
      {children}
    </Positioned>
  );
}
OverlayLayer.displayName = 'OverlayLayer';

export interface PageBoxProps {
  transform: OverlayTransform;
  box: PageSpaceBox;
  /** Degrees, clockwise about the box centre. */
  rotate?: number;
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

/** Positions a page-space box in the overlay (both corners mapped, normalised). */
export function PageBox({
  transform,
  box,
  rotate,
  className,
  children,
  'data-testid': testId,
}: PageBoxProps) {
  const r = mapBox(transform, box);
  return (
    <Positioned
      x={r.left}
      y={r.top}
      width={r.width}
      height={r.height}
      rotate={rotate}
      className={className}
      data-testid={testId}
    >
      {children}
    </Positioned>
  );
}
PageBox.displayName = 'PageBox';
