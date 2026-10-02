import React, { useEffect, useRef, useState } from 'react';
import { IconAlertTriangle } from '@/shared/ui/icons';
import { Spinner } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { usePageBitmap, type PageInfo } from '@/pdf/render';
import type { Rotation } from '@/pdf/edit';
import { thumbBoxSize } from './thumb-size';

const rotationClass: Record<Rotation, string> = {
  0: '',
  90: 'rotate-90',
  180: 'rotate-180',
  270: '-rotate-90',
};

interface PageThumbProps {
  docId: string;
  pageIndex: number;
  page: PageInfo;
  /** CSS px. */
  width: number;
  /** Extra rotation previewed on top of the page's own. */
  rotation?: Rotation;
  label: string;
}

/** Start rendering when this close to the viewport. */
const NEAR_MARGIN = '400px';
/** Release canvas pixels when further than this from the viewport. */
const FAR_MARGIN = '1500px';

/**
 * Renders only once scrolled near the viewport, and keeps its pixels if the
 * bitmap cache evicts them while on screen. Far off-screen it releases its
 * canvas backing store (re-requested on return; a cache hit is free), so a
 * long grid holds pixels only for tiles around the viewport.
 */
export const PageThumb: React.FC<PageThumbProps> = ({
  docId,
  pageIndex,
  page,
  width,
  rotation = 0,
  label,
}) => {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  // Which page/width the canvas currently shows. Kept when the hook later
  // returns null (cache eviction) so the drawn pixels stay on screen; cleared
  // when the tile is released far off-screen.
  const [drawnKey, setDrawnKey] = useState<string | null>(null);
  const pixelWidth = Math.round(width * (window.devicePixelRatio || 1));
  const { bitmap, error } = usePageBitmap(
    docId,
    pageIndex,
    pixelWidth,
    visible,
  );
  const key = `${docId}:${pageIndex}:${pixelWidth}`;
  const drawable = visible && bitmap !== null && bitmap.width > 0;
  // Adjust state during render; the effect below draws this bitmap on commit.
  if (drawable && drawnKey !== key) setDrawnKey(key);
  if (!visible && drawnKey !== null) setDrawnKey(null);
  const hasDrawn = drawable || (visible && drawnKey === key);
  const { outerHeight, innerWidth } = thumbBoxSize(page, width, rotation);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // Two thresholds (hysteresis): render when near, release only when far,
    // so tiles at the edge of the viewport don't flap.
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { rootMargin: NEAR_MARGIN },
    );
    const far = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) setVisible(false);
      },
      { rootMargin: FAR_MARGIN },
    );
    near.observe(el);
    far.observe(el);
    return () => {
      near.disconnect();
      far.disconnect();
    };
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    if (!visible) {
      // Free the backing store (~0.45 MB per tile at DPR 2).
      c.width = 0;
      c.height = 0;
      delete c.dataset.rendered;
      return;
    }
    if (!bitmap || bitmap.width === 0) return;
    c.width = bitmap.width;
    c.height = bitmap.height;
    c.getContext('2d')?.drawImage(bitmap, 0, 0);
    // Marker for tests/tools: pixels are drawn (kept after cache eviction,
    // removed when released off-screen).
    c.dataset.rendered = 'true';
  }, [bitmap, visible]);

  return (
    <div
      ref={box}
      className="flex items-center justify-center overflow-hidden"
      style={{ width, height: outerHeight }}
    >
      <div
        className={cn(
          'relative shrink-0 bg-white shadow-sm transition-transform',
          rotationClass[rotation],
        )}
        style={{
          width: innerWidth,
          aspectRatio: `${page.width} / ${page.height}`,
        }}
      >
        <canvas
          ref={canvas}
          role="img"
          aria-label={label}
          className="block size-full"
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center">
            {error ? (
              <span
                role="img"
                aria-label={error.message}
                title={error.message}
                className="text-danger"
              >
                <IconAlertTriangle size="sm" />
              </span>
            ) : (
              // Decorative: a grid of thumbs must not create a live region each.
              <span aria-hidden>
                <Spinner size="sm" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
