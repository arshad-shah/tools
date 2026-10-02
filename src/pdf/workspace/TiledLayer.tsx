import { useEffect, useState, useSyncExternalStore } from 'react';
import { logToolError, toToolError } from '@/shared/lib/errors';
import { BitmapCanvas, Positioned } from '@/shared/ui';
import { bitmapCache, pdfRender } from '@/pdf/render';
import type { Rotation } from '@/pdf/doc/types';
import { planTiles, type Rect, type Tile } from './tile-plan';

// Tiles share the page bitmaps' pixel budget; an eviction re-renders the
// mounted tiles so a visible one asks again.
let evictions = 0;
bitmapCache.subscribe(() => evictions++);
const subscribe = (l: () => void) => bitmapCache.subscribe(l);
const getEvictions = () => evictions;

function TileImage({
  docId,
  pageIndex,
  scale,
  tile,
  rotate,
  label,
}: {
  docId: string;
  pageIndex: number;
  /** Device px per PDF point. */
  scale: number;
  tile: Tile;
  rotate: Rotation;
  label: string;
}) {
  const { x, y, width, height } = tile.source;
  const key = `${docId}:${pageIndex}:${scale}:${x}:${y}:${width}:${height}`;
  const [state, setState] = useState<{
    key: string;
    bitmap: ImageBitmap;
  } | null>(null);
  useSyncExternalStore(subscribe, getEvictions, getEvictions);
  const cached = bitmapCache.getTile(key);
  const live = cached && cached.width > 0 ? cached : null;
  const own =
    state?.key === key && state.bitmap.width > 0 ? state.bitmap : null;
  const missing = !live && !own;

  useEffect(() => {
    if (!missing) return;
    const ctrl = new AbortController();
    pdfRender
      .renderTile(
        docId,
        pageIndex,
        scale,
        { x, y, width, height },
        ctrl.signal,
        0,
      )
      .then(
        (bitmap) => {
          bitmapCache.setTile(docId, key, bitmap);
          if (!ctrl.signal.aborted) setState({ key, bitmap });
        },
        (e) => {
          const error = toToolError(e);
          if (error.code !== 'CANCELLED') logToolError(error);
        },
      );
    return () => ctrl.abort();
  }, [missing, key, docId, pageIndex, scale, x, y, width, height]);

  const bitmap = live ?? own;
  if (!bitmap) return null;
  const quarter = rotate === 90 || rotate === 270;
  const s = tile.shown;
  return (
    <Positioned
      x={s.left}
      y={s.top}
      width={s.width}
      height={s.height}
      className="flex items-center justify-center overflow-visible"
    >
      <BitmapCanvas
        bitmap={bitmap}
        width={quarter ? s.height : s.width}
        height={quarter ? s.width : s.height}
        rotation={rotate}
        label={label}
      />
    </Positioned>
  );
}

/**
 * Sharp tiles over the visible part of a page above 200% zoom (spec §14):
 * the base bitmap underneath stays at a capped resolution.
 */
export function TiledLayer({
  docId,
  pageIndex,
  scale,
  shown,
  crop,
  rotate,
  visible,
  label,
}: {
  docId: string;
  pageIndex: number;
  /** CSS px per PDF point. */
  scale: number;
  shown: { width: number; height: number };
  /** The displayed area in the full page's viewport (CSS px at `scale`). */
  crop: Rect;
  rotate: Rotation;
  /** The slot's visible part (CSS px). */
  visible: Rect;
  label: string;
}) {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const tiles = planTiles({ shown, crop, rotate, visible, dpr });
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {tiles.map((t) => (
        <TileImage
          key={t.key}
          docId={docId}
          pageIndex={pageIndex}
          scale={scale * dpr}
          tile={t}
          rotate={rotate}
          label={label}
        />
      ))}
    </div>
  );
}
