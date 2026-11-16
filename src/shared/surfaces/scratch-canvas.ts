import { ToolError } from '@/shared/lib/errors';

/** A canvas that is never shown: drawn on, read back or encoded. */
export type ScratchCanvas = OffscreenCanvas | HTMLCanvasElement;
export type ScratchContext2D =
  | OffscreenCanvasRenderingContext2D
  | CanvasRenderingContext2D;

/** Whether createScratchCanvas can make a canvas in this context. */
export const hasScratchCanvas = () =>
  typeof OffscreenCanvas !== 'undefined' ||
  (typeof document !== 'undefined' && !!document);

/**
 * An off-screen drawing surface: OffscreenCanvas where the browser has it,
 * else a detached canvas element (older browsers, main thread only). A
 * worker without OffscreenCanvas has neither and gets UNSUPPORTED_FEATURE.
 */
export function createScratchCanvas(
  width: number,
  height: number,
): ScratchCanvas {
  if (typeof OffscreenCanvas !== 'undefined')
    return new OffscreenCanvas(width, height);
  if (!hasScratchCanvas())
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      'This browser cannot draw images here (no OffscreenCanvas)',
    );
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Its 2D context, or null when the browser refuses (e.g. too large). */
export function scratchContext2D(
  canvas: ScratchCanvas,
  settings?: CanvasRenderingContext2DSettings,
): ScratchContext2D | null {
  return canvas.getContext('2d', settings) as ScratchContext2D | null;
}

/** Encodes the canvas; null when the browser cannot. */
export async function canvasToBlob(
  canvas: ScratchCanvas,
  type: string,
  quality?: number,
): Promise<Blob | null> {
  if (!('toBlob' in canvas))
    return canvas.convertToBlob({ type, quality }).catch(() => null);
  return new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, type, quality);
    } catch {
      resolve(null);
    }
  });
}
