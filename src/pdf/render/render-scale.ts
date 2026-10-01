import { ToolError } from '@/shared/lib/errors';

/** 4096 x 4096: well inside every browser's canvas limit. */
export const MAX_CANVAS_PIXELS = 16_777_216;
const MAX_SCALE = 4;

/**
 * Scale that renders a `baseWidth` x `baseHeight` (scale-1) page at
 * `widthPx`, capped at 4x and at MAX_CANVAS_PIXELS of (ceil'd) canvas.
 */
export function renderScale(
  baseWidth: number,
  baseHeight: number,
  widthPx: number,
): number {
  if (!Number.isFinite(widthPx) || widthPx <= 0) {
    throw new ToolError(
      'INVALID_INPUT',
      'Page width must be a positive number',
    );
  }
  let scale = Math.min(MAX_SCALE, widthPx / baseWidth);
  const area = (s: number) =>
    Math.ceil(baseWidth * s) * Math.ceil(baseHeight * s);
  if (area(scale) > MAX_CANVAS_PIXELS) {
    scale = Math.sqrt(MAX_CANVAS_PIXELS / (baseWidth * baseHeight));
    while (area(scale) > MAX_CANVAS_PIXELS) scale *= 0.999;
  }
  return scale;
}
