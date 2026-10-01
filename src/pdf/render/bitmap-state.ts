import type { ToolError } from '@/shared/lib/errors';

export const bitmapKey = (docId: string, page: number, width: number) =>
  `${docId}:${page}:${width}`;

export interface PageBitmap {
  bitmap: ImageBitmap | null;
  error: ToolError | null;
}

export interface KeyedPageBitmap extends PageBitmap {
  key: string;
}

const live = (b: ImageBitmap | null | undefined) =>
  b && b.width > 0 ? b : null;

/**
 * What `usePageBitmap` shows for `key`: a live cached bitmap, else the stored
 * result only if it belongs to this key. Closed (zero-width) bitmaps never
 * leak out.
 */
export function pickPageBitmap(
  key: string | null,
  state: KeyedPageBitmap | null,
  cached?: ImageBitmap,
): PageBitmap {
  if (!key) return { bitmap: null, error: null };
  const hit = live(cached);
  if (hit) return { bitmap: hit, error: null };
  if (!state || state.key !== key) return { bitmap: null, error: null };
  return { bitmap: live(state.bitmap), error: state.error };
}
