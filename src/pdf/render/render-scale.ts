import { ToolError } from '@/shared/lib/errors';

/** 4096 x 4096: well inside every browser's canvas limit. */
export const MAX_CANVAS_PIXELS = 16_777_216;
const MAX_SCALE = 4;

/**
 * Canvas pixels for a scaled CSS length: rounds up, but ignores float noise
 * (612 pt at 150 DPI is 1275.0000000000002, not 1276 px).
 */
export function canvasPx(length: number): number {
  return Math.max(1, Math.ceil(length - 1e-6));
}

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
    canvasPx(baseWidth * s) * canvasPx(baseHeight * s);
  if (area(scale) > MAX_CANVAS_PIXELS) {
    scale = Math.sqrt(MAX_CANVAS_PIXELS / (baseWidth * baseHeight));
    while (area(scale) > MAX_CANVAS_PIXELS) scale *= 0.999;
  }
  return scale;
}

/**
 * Validates a tile request: a positive scale and a whole-pixel tile (in
 * viewport px at that scale) no larger than MAX_CANVAS_PIXELS.
 */
export function checkTile(
  scale: number,
  tile: { x: number; y: number; width: number; height: number },
): void {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new ToolError('INVALID_INPUT', 'Zoom must be a positive number');
  }
  const { x, y, width, height } = tile;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width * height > MAX_CANVAS_PIXELS
  ) {
    throw new ToolError(
      'INVALID_INPUT',
      'Tile size must be a positive whole number of pixels within the canvas limit',
    );
  }
}

export const MIN_EXPORT_DPI = 72;
export const MAX_EXPORT_DPI = 300;

/**
 * Scale for exporting a page at `dpi` (pdf.js scale 1 = 72 DPI). Pages too
 * large for the canvas cap are scaled down to fit it; the DPI actually used
 * is reported so the UI can say so.
 */
export function exportScale(
  baseWidth: number,
  baseHeight: number,
  dpi: number,
): { scale: number; dpi: number; capped: boolean } {
  if (!Number.isInteger(dpi) || dpi < MIN_EXPORT_DPI || dpi > MAX_EXPORT_DPI) {
    throw new ToolError(
      'INVALID_INPUT',
      `Resolution must be a whole number from ${MIN_EXPORT_DPI} to ${MAX_EXPORT_DPI} DPI`,
    );
  }
  const area = (s: number) =>
    canvasPx(baseWidth * s) * canvasPx(baseHeight * s);
  let scale = dpi / 72;
  if (area(scale) <= MAX_CANVAS_PIXELS) return { scale, dpi, capped: false };
  scale = Math.sqrt(MAX_CANVAS_PIXELS / (baseWidth * baseHeight));
  while (area(scale) > MAX_CANVAS_PIXELS) scale *= 0.999;
  return { scale, dpi: Math.floor(scale * 72), capped: true };
}
