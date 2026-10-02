import React, { useEffect, useRef } from 'react';
import { cn } from '@/shared/lib/cn';

const ROTATION = {
  0: '',
  90: 'rotate-90',
  180: 'rotate-180',
  270: '-rotate-90',
} as const;

export interface BitmapCanvasProps {
  /** Drawn on change. Becoming null keeps the last pixels (note N2). */
  bitmap: ImageBitmap | null;
  /** CSS px box. */
  width: number;
  /** CSS px; omitted = from `aspect`. */
  height?: number;
  /** width / height when height is omitted. */
  aspect?: number;
  /** Accessible name (role="img"). */
  label: string;
  /** Previewed rotation, applied as a CSS transform. */
  rotation?: 0 | 90 | 180 | 270;
  /** Free the backing store (pixels and data-rendered) until it is false. */
  release?: boolean;
  className?: string;
  /** After a successful draw. */
  onDrawn?(): void;
  /** Overlays (spinners, errors) laid over the canvas. */
  children?: React.ReactNode;
  'data-testid'?: string;
}

/**
 * Draws an ImageBitmap (page renders, thumbnails). Owns the canvas; sets
 * `data-rendered="true"` on it after each draw (e2e contract).
 */
export function BitmapCanvas({
  bitmap,
  width,
  height,
  aspect,
  label,
  rotation = 0,
  release,
  className,
  onDrawn,
  children,
  'data-testid': testId,
}: BitmapCanvasProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawn = useRef<(() => void) | undefined>(onDrawn);
  useEffect(() => {
    drawn.current = onDrawn;
  });

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    if (release) {
      c.width = 0;
      c.height = 0;
      delete c.dataset.rendered;
      return;
    }
    if (!bitmap || bitmap.width === 0) return;
    c.width = bitmap.width;
    c.height = bitmap.height;
    c.getContext('2d')?.drawImage(bitmap, 0, 0);
    c.dataset.rendered = 'true';
    drawn.current?.();
  }, [bitmap, release]);

  return (
    <div
      data-testid={testId}
      className={cn(
        'relative shrink-0 overflow-hidden',
        ROTATION[rotation],
        className,
      )}
      style={{
        width,
        height,
        aspectRatio:
          height === undefined && aspect !== undefined ? aspect : undefined,
      }}
    >
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        className="block size-full"
      />
      {children}
    </div>
  );
}
BitmapCanvas.displayName = 'BitmapCanvas';
