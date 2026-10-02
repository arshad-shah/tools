import type React from 'react';
import { cn } from '@/shared/lib/cn';
import { Positioned } from './positioned';
import {
  applyPoint,
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
  /** 0..1. */
  opacity?: number;
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

/** Positions a page-space box in the overlay (both corners mapped, normalised). */
export function PageBox({
  transform,
  box,
  rotate,
  opacity,
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
      opacity={opacity}
      className={className}
      data-testid={testId}
    >
      {children}
    </Positioned>
  );
}
PageBox.displayName = 'PageBox';

export interface PagePlacedProps {
  transform: OverlayTransform;
  /** Page-space corner the content turns about: its lower-left, unturned. */
  x: number;
  y: number;
  /** Content size in page units (points). */
  width: number;
  height: number;
  /** Degrees counter-clockwise about (x, y), as pdf-lib draws an image. */
  rotate?: number;
  /** 0..1. */
  opacity?: number;
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

/**
 * Content laid out in page units and mapped onto the page as the writers
 * draw it: turned about its lower-left corner and with the page's own
 * rotation, so an image keeps its orientation on a rotated page. PageBox
 * instead fills the box's screen rectangle.
 */
export function PagePlaced({
  transform: t,
  x,
  y,
  width,
  height,
  rotate = 0,
  opacity,
  className,
  children,
  'data-testid': testId,
}: PagePlacedProps) {
  const r = (rotate * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  // Content px (u right, v down) to page: (x, y) + R(u, height - v).
  const [e, f] = applyPoint(t, x - sin * height, y + cos * height);
  const m = [
    t.a * cos + t.c * sin,
    t.b * cos + t.d * sin,
    t.a * sin - t.c * cos,
    t.b * sin - t.d * cos,
    e,
    f,
  ];
  return (
    <div
      data-testid={testId}
      className={cn('absolute top-0 left-0 origin-top-left', className)}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transform: `matrix(${m.join(', ')})`,
        opacity,
      }}
    >
      {children}
    </div>
  );
}
PagePlaced.displayName = 'PagePlaced';
