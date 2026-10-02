import { ToolError } from '@/shared/lib/errors';
import type { RpcContext } from '@/shared/lib/worker-rpc';
import { kmeansOklab, MAX_SAMPLES, type PaletteEntry } from './kmeans';

/**
 * Decodes an image downscaled to at most 100k pixels and returns its
 * k-means palette. Browser or worker only.
 */
export async function extractPalette(
  file: Blob,
  k: number,
  ctx: Pick<RpcContext, 'signal'>,
): Promise<PaletteEntry[]> {
  if (!(Number.isInteger(k) && k >= 3 && k <= 12))
    throw new ToolError('INVALID_INPUT', 'Choose between 3 and 12 colours');
  if (typeof OffscreenCanvas === 'undefined')
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      'This browser cannot read image pixels here (no OffscreenCanvas)',
    );
  let probe: ImageBitmap;
  try {
    probe = await createImageBitmap(file);
  } catch (cause) {
    throw new ToolError('INVALID_FILE', 'This image could not be decoded', {
      cause,
    });
  }
  const scale = Math.min(
    1,
    Math.sqrt(MAX_SAMPLES / (probe.width * probe.height)),
  );
  const width = Math.max(1, Math.round(probe.width * scale));
  const height = Math.max(1, Math.round(probe.height * scale));
  const bitmap =
    scale < 1
      ? await createImageBitmap(probe, {
          resizeWidth: width,
          resizeHeight: height,
          resizeQuality: 'medium',
        })
      : probe;
  try {
    if (ctx.signal.aborted) throw new ToolError('CANCELLED', 'Cancelled');
    const canvas = new OffscreenCanvas(width, height);
    const g = canvas.getContext('2d', { willReadFrequently: true });
    if (!g)
      throw new ToolError('INVALID_FILE', 'This image is too large to read');
    g.drawImage(bitmap, 0, 0);
    return kmeansOklab(g.getImageData(0, 0, width, height).data, k);
  } finally {
    if (bitmap !== probe) bitmap.close();
    probe.close();
  }
}
