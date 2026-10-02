import { useState } from 'react';
import { IconAlertTriangle } from '@/shared/ui/icons';
import { BitmapCanvas, Sized, Spinner } from '@/shared/ui';
import { boxToScreen, pageViewport } from '@/pdf/doc/geometry';
import type { PageRef, SourceRef } from '@/pdf/doc/types';
import { usePageBitmap, type Priority } from '@/pdf/render';
import { pageGeom } from './page-display';

export interface PageImageProps {
  page: PageRef;
  sources: Record<string, SourceRef>;
  /** Render-worker document of the page's source (null while it opens). */
  docId: string | null;
  /** Load error of the source. */
  error?: string | null;
  /** CSS px per PDF point. */
  scale: number;
  visible: boolean;
  priority: Priority;
  label: string;
  /** Render the bitmap at most at this scale (CSS-stretched above; tiles add detail). */
  maxScale?: number;
}

/** Bitmap widths snap to this step so small zoom changes reuse a render. */
const STEP = 256;
const snap = (px: number) => Math.max(STEP / 2, Math.ceil(px / STEP) * STEP);

/**
 * One page as the workspace shows it: the source page rendered by pdf.js
 * (its own /Rotate applied), then the pending crop as a clip and the pending
 * rotation as a transform (spec §6.3). Keeps its pixels while a sharper
 * render for a new zoom arrives.
 */
export function PageImage({
  page,
  sources,
  docId,
  error,
  scale,
  visible,
  priority,
  label,
  maxScale = Infinity,
}: PageImageProps) {
  const geom = pageGeom(page, sources);
  const shown = pageViewport(geom, page.rotate, scale, page.crop);
  // The full page as rendered (own rotation, no crop, no pending rotation).
  const full = pageViewport(geom, 0, scale);
  const crop = page.crop ? boxToScreen(full, page.crop) : null;
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const renderWidth = pageViewport(geom, 0, Math.min(scale, maxScale)).width;
  const widthPx = snap(renderWidth * dpr);
  const { bitmap, error: renderError } = usePageBitmap(
    page.blank ? null : docId,
    page.index,
    widthPx,
    visible,
    priority,
  );
  const [drawn, setDrawn] = useState(false);
  const failed = error ?? renderError?.message ?? null;

  // The unrotated box; a 90 or 270 degree rotation swaps it on screen.
  const quarter = page.rotate === 90 || page.rotate === 270;
  const boxW = quarter ? shown.height : shown.width;
  const boxH = quarter ? shown.width : shown.height;

  if (page.blank)
    return (
      <Sized
        width={shown.width}
        height={shown.height}
        className="bg-white"
        role="img"
        aria-label={label}
        data-rendered="true"
      />
    );

  return (
    <Sized
      width={shown.width}
      height={shown.height}
      className="flex items-center justify-center overflow-hidden bg-white"
    >
      <BitmapCanvas
        bitmap={bitmap}
        width={boxW}
        height={boxH}
        rotation={page.rotate}
        crop={
          crop && full.width > 0 && full.height > 0
            ? {
                x: crop.left / full.width,
                y: crop.top / full.height,
                width: crop.width / full.width,
                height: crop.height / full.height,
              }
            : undefined
        }
        label={label}
        onDrawn={() => setDrawn(true)}
      >
        {!drawn && !bitmap ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {failed ? (
              <span role="img" aria-label={failed} className="text-danger">
                <IconAlertTriangle size="md" />
              </span>
            ) : (
              <span aria-hidden>
                <Spinner size="sm" />
              </span>
            )}
          </div>
        ) : null}
      </BitmapCanvas>
    </Sized>
  );
}
