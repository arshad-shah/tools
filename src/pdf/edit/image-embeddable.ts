import { ToolError } from '@/shared/lib/errors';
import { detectKind } from '@/shared/lib/files';
import { convertToPng } from '@/shared/lib/image-convert';

/**
 * An image as PDF can embed it: PNG and JPEG pass through, WebP and GIF
 * (first frame) are converted to PNG with the browser's decoder. Runs on the
 * main thread before an op stores the asset, so assets are PNG or JPEG.
 */
export async function toEmbeddable(
  bytes: Uint8Array,
  name = 'The image',
): Promise<{ bytes: Uint8Array; mime: 'image/png' | 'image/jpeg' }> {
  const kind = detectKind(bytes.subarray(0, 1024));
  if (kind === 'png') return { bytes, mime: 'image/png' };
  if (kind === 'jpeg') return { bytes, mime: 'image/jpeg' };
  if (kind === 'webp' || kind === 'gif')
    return { bytes: await convertToPng(bytes, kind, name), mime: 'image/png' };
  throw new ToolError(
    'INVALID_FILE',
    `${name} is not a PNG, JPEG, WebP or GIF image`,
  );
}
