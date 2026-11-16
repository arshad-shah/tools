import { useEffect, useRef, type ReactNode } from 'react';

const ROTATE = {
  0: undefined,
  90: 'rotate(90deg)',
  180: 'rotate(180deg)',
  270: 'rotate(-90deg)',
};

export interface BitmapSurfaceProps {
  /** Drawn on change. Becoming null keeps the last pixels. */
  bitmap: ImageBitmap | null;
  /** CSS px box. */
  width: number;
  height: number;
  /** Accessible name (role="img"). */
  label: string;
  /** Previewed rotation, applied as a CSS transform. */
  rotation?: 0 | 90 | 180 | 270;
  /** Part of the bitmap to show, as fractions (0..1) of its size (a previewed crop). */
  crop?: { x: number; y: number; width: number; height: number };
  /** After a successful draw. */
  onDrawn?(): void;
  /** Laid over the canvas (a spinner, an error). */
  children?: ReactNode;
}

/**
 * A page render (an ImageBitmap from the pdf.js worker) on a canvas. Sets
 * `data-rendered="true"` on the canvas after each draw (the e2e contract).
 */
export function BitmapSurface({
  bitmap,
  width,
  height,
  label,
  rotation = 0,
  crop,
  onDrawn,
  children,
}: BitmapSurfaceProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // Primitive deps: a new crop object with the same numbers is no change.
  const { x: cropX, y: cropY, width: cropW, height: cropH } = crop ?? {};
  const drawn = useRef(onDrawn);
  useEffect(() => {
    drawn.current = onDrawn;
  });
  useEffect(() => {
    const c = canvas.current;
    if (!c || !bitmap || bitmap.width === 0) return;
    const sx = Math.round((cropX ?? 0) * bitmap.width);
    const sy = Math.round((cropY ?? 0) * bitmap.height);
    const sw = Math.max(1, Math.round((cropW ?? 1) * bitmap.width));
    const sh = Math.max(1, Math.round((cropH ?? 1) * bitmap.height));
    c.width = sw;
    c.height = sh;
    c.getContext('2d')?.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
    c.dataset.rendered = 'true';
    drawn.current?.();
  }, [bitmap, cropX, cropY, cropW, cropH]);
  return (
    <div
      style={{
        position: 'relative',
        flex: 'none',
        overflow: 'hidden',
        width,
        height,
        transform: ROTATE[rotation],
        // Paper is white in both themes: it is the page, not the app.
        background: '#fff',
      }}
    >
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      {children}
    </div>
  );
}
