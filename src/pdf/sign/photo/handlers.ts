/**
 * The photo worker's RPC surface. Both calls are synchronous inside the
 * worker, so they cannot observe an abort: the client cancels by
 * terminating the worker instead.
 */
import { ToolError } from '@/shared/lib/errors';
import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';
import { traceMask, type TraceOptions } from '@/pdf/sign/trace/trace';
import type { Mask } from './binarize';
import { MAX_PIXELS } from './decode';
import { cleanSignaturePhoto, type CleanOptions } from './pipeline';

/** Draws the bitmap to an OffscreenCanvas and reads its pixels back. */
function bitmapPixels(bitmap: ImageBitmap): Uint8ClampedArray {
  const { width, height } = bitmap;
  const canvas = new OffscreenCanvas(width, height);
  const g = canvas.getContext('2d', { willReadFrequently: true });
  if (!g)
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      'This browser cannot read photos in the background. Try another browser.',
    );
  g.drawImage(bitmap, 0, 0);
  bitmap.close();
  return g.getImageData(0, 0, width, height).data;
}

export const photoHandlers = {
  /** Cleans a signature photo; the mask's buffer is transferred back. */
  clean(_ctx: RpcContext, bitmap: ImageBitmap, opts: CleanOptions = {}) {
    const { width, height } = bitmap;
    if (width * height > MAX_PIXELS) {
      bitmap.close();
      throw new ToolError('TOO_LARGE', 'This photo is too large to clean up');
    }
    const result = cleanSignaturePhoto(
      bitmapPixels(bitmap),
      width,
      height,
      opts,
    );
    return new Transferred(result, [result.mask.data.buffer]);
  },
  /** Traces a cleaned mask to vector path data. */
  trace(_ctx: RpcContext, mask: Mask, opts: TraceOptions = {}) {
    return traceMask(mask, opts);
  },
};

export type PhotoHandlers = typeof photoHandlers;
