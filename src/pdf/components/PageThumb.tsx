import React, { useEffect, useRef, useState } from 'react';
import { IconAlertTriangle } from '@/shared/ui/icons';
import { BitmapCanvas, Sized, Spinner } from '@/shared/ui';
import { usePageBitmap, type PageInfo } from '@/pdf/render';
import type { Rotation } from '@/pdf/edit';
import { thumbBoxSize } from './thumb-size';

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
  // Adjust state during render; BitmapCanvas draws this bitmap on commit.
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

  return (
    <Sized
      ref={box}
      className="flex items-center justify-center overflow-hidden"
      width={width}
      height={outerHeight}
    >
      <BitmapCanvas
        bitmap={drawable ? bitmap : null}
        // Far off-screen the tile frees its backing store (~0.45 MB at DPR 2).
        release={!visible}
        width={innerWidth}
        aspect={page.width / page.height}
        rotation={rotation}
        label={label}
        className="bg-white shadow-sm transition-transform"
      >
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
      </BitmapCanvas>
    </Sized>
  );
};
