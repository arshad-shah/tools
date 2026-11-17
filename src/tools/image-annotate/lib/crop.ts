import type { Rect, Size } from './geometry';

/** Crop aspect choices: free, the image's own, or fixed ratios. */
export type CropAspect =
  | 'free'
  | 'original'
  | '1:1'
  | '4:3'
  | '3:2'
  | '16:9'
  | '3:4'
  | '9:16';

export const CROP_ASPECTS: readonly { value: CropAspect; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: 'original', label: 'Original' },
  { value: '1:1', label: 'Square (1:1)' },
  { value: '4:3', label: '4:3' },
  { value: '3:2', label: '3:2' },
  { value: '16:9', label: '16:9' },
  { value: '3:4', label: '3:4 (portrait)' },
  { value: '9:16', label: '9:16 (portrait)' },
];

/** Width over height for the aspect, or null for free. */
export function aspectRatio(a: CropAspect, image: Size): number | null {
  if (a === 'free') return null;
  if (a === 'original') return image.width / image.height;
  const [w, h] = a.split(':').map(Number);
  return w / h;
}

/**
 * The largest rect of `ratio` inside `rect`, centred on it, in whole
 * pixels.
 */
export function fitAspect(rect: Rect, ratio: number): Rect {
  let width = rect.width;
  let height = width / ratio;
  if (height > rect.height) {
    height = rect.height;
    width = height * ratio;
  }
  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));
  return {
    x: Math.round(rect.x + (rect.width - width) / 2),
    y: Math.round(rect.y + (rect.height - height) / 2),
    width,
    height,
  };
}

/**
 * A crop typed into the fields: whole pixels, at least 1 by 1, inside the
 * image. The corner stays where it was typed and the size gives way.
 */
export function clampCrop(r: Rect, image: Size): Rect {
  const x = Math.max(0, Math.min(image.width - 1, Math.round(r.x)));
  const y = Math.max(0, Math.min(image.height - 1, Math.round(r.y)));
  return {
    x,
    y,
    width: Math.max(1, Math.min(image.width - x, Math.round(r.width))),
    height: Math.max(1, Math.min(image.height - y, Math.round(r.height))),
  };
}

/** One field changed with a fixed ratio: the other side follows. */
export function withAspect(
  r: Rect,
  changed: 'width' | 'height',
  ratio: number | null,
): Rect {
  if (ratio === null) return r;
  return changed === 'width'
    ? { ...r, height: Math.round(r.width / ratio) }
    : { ...r, width: Math.round(r.height * ratio) };
}
