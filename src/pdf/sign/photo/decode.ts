import { ToolError } from '@/shared/lib/errors';

/** Largest photo file accepted. */
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
/** Longest side the clean-up works at (the pipeline downscales to this anyway). */
export const MAX_SIDE = 1600;
/** Pixels the worker accepts in one bitmap. */
export const MAX_PIXELS = MAX_SIDE * MAX_SIDE;

export const PHOTO_TOO_LARGE =
  'This photo is larger than 25 MB. Use a smaller photo of your signature.';

export interface Size {
  width: number;
  height: number;
}

const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u24le = (b: Uint8Array, i: number) =>
  b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const u32be = (b: Uint8Array, i: number) =>
  ((b[i] << 24) >>> 0) + ((b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]);

/** Pixel size from a PNG, JPEG or WebP header; null when it can't tell. */
export function imageSize(b: Uint8Array): Size | null {
  // PNG: signature, then the IHDR chunk.
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return b.length >= 24
      ? { width: u32be(b, 16), height: u32be(b, 20) }
      : null;
  // JPEG: walk the markers to a start-of-frame.
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      if (marker === 0xff) {
        i++;
        continue;
      }
      const len = u16be(b, i + 2);
      const sof =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        ![0xc4, 0xc8, 0xcc].includes(marker);
      if (sof) return { width: u16be(b, i + 7), height: u16be(b, i + 5) };
      i += 2 + len;
    }
    return null;
  }
  // WebP: RIFF....WEBP, then VP8 / VP8L / VP8X.
  if (
    b.length >= 30 &&
    String.fromCharCode(...b.subarray(0, 4)) === 'RIFF' &&
    String.fromCharCode(...b.subarray(8, 12)) === 'WEBP'
  ) {
    const chunk = String.fromCharCode(...b.subarray(12, 16));
    if (chunk === 'VP8X')
      return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
    if (chunk === 'VP8L') {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }
    if (chunk === 'VP8 ')
      return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
  }
  return null;
}

/** `s` scaled down (never up) so its longer side is at most `max`. */
export function fitWithin(s: Size, max = MAX_SIDE): Size {
  const k = Math.min(1, max / Math.max(s.width, s.height));
  return {
    width: Math.max(1, Math.round(s.width * k)),
    height: Math.max(1, Math.round(s.height * k)),
  };
}

const unreadable = (cause: unknown) =>
  new ToolError('INVALID_FILE', 'This image could not be read', { cause });

/** A bitmap no larger than MAX_SIDE; `bitmap` is closed when replaced. */
export async function downscaleBitmap(
  bitmap: ImageBitmap,
): Promise<ImageBitmap> {
  const fit = fitWithin(bitmap);
  if (fit.width === bitmap.width && fit.height === bitmap.height) return bitmap;
  try {
    return await createImageBitmap(bitmap, {
      resizeWidth: fit.width,
      resizeHeight: fit.height,
      resizeQuality: 'high',
    });
  } catch (cause) {
    throw unreadable(cause);
  } finally {
    bitmap.close();
  }
}

/**
 * Decodes a photo straight to at most MAX_SIDE pixels on its longer side
 * (the size is read from the file header, so the full-size image is never
 * kept). Refuses files over 25 MB.
 */
export async function decodePhoto(file: Blob): Promise<ImageBitmap> {
  if (file.size > MAX_PHOTO_BYTES)
    throw new ToolError('TOO_LARGE', PHOTO_TOO_LARGE);
  const head = new Uint8Array(await file.slice(0, 64 * 1024).arrayBuffer());
  const size = imageSize(head);
  let bitmap: ImageBitmap;
  try {
    if (!size) bitmap = await createImageBitmap(file);
    else {
      // One dimension only: the decoder keeps the aspect ratio, so an EXIF
      // quarter turn can't stretch the photo; downscaleBitmap then caps it.
      const fit = fitWithin(size);
      bitmap = await createImageBitmap(file, {
        ...(size.width >= size.height
          ? { resizeWidth: fit.width }
          : { resizeHeight: fit.height }),
        resizeQuality: 'high',
      });
    }
  } catch (cause) {
    throw unreadable(cause);
  }
  return downscaleBitmap(bitmap);
}
