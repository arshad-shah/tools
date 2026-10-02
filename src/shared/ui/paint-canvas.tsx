import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';

export interface PaintSize {
  /** CSS px. */
  width: number;
  height: number;
  dpr: number;
}

type PaintA11y =
  | { label: string; decorative?: false }
  | { decorative: true; label?: undefined };

export type PaintCanvasProps = PaintA11y & {
  /**
   * Draws in CSS px (the context is pre-scaled by the device pixel ratio).
   * Re-runs when this function or the size changes; memoise it.
   */
  paint(ctx: CanvasRenderingContext2D, size: PaintSize): void;
  className?: string;
  /** Fixed CSS px size; without it the className sizes the canvas. */
  width?: number;
  height?: number;
  'aria-describedby'?: string;
} & Pick<
    React.HTMLAttributes<HTMLCanvasElement>,
    'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'
  >;

/**
 * A canvas sized by its CSS box (className) and drawn by `paint` at the
 * device pixel ratio. Owns the canvas element (spec §1A R2).
 */
export function PaintCanvas({
  paint,
  className,
  label,
  decorative,
  width,
  height,
  ...events
}: PaintCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({
    width: width ?? 0,
    height: height ?? 0,
  });

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const measure = () => {
      const next = {
        width: c.clientWidth || (width ?? 0),
        height: c.clientHeight || (height ?? 0),
      };
      setSize((s) =>
        s.width === next.width && s.height === next.height ? s : next,
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(c);
    return () => observer.disconnect();
  }, [width, height]);

  useEffect(() => {
    const c = ref.current;
    if (!c || size.width <= 0 || size.height <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(size.width * dpr);
    c.height = Math.round(size.height * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint(ctx, { ...size, dpr });
  }, [paint, size]);

  return (
    <canvas
      ref={ref}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      className={cn('block', className)}
      style={width || height ? { width, height } : undefined}
      {...events}
    />
  );
}
PaintCanvas.displayName = 'PaintCanvas';
