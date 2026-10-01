import { ToolError } from '@/shared/lib/errors';
import type { ImageCodec } from './codec';
import { toRgba } from './pixels';

/**
 * The browser/worker codec: exact pixels in, JPEG out.
 * - Colour management is off, so sample values round-trip unchanged.
 * - `imageOrientation: 'none'`: EXIF orientation is never applied (the
 *   caller strips EXIF too; PDF viewers ignore it in a DCT stream).
 * - When the caller passes a target size the decoder scales straight to it,
 *   so a large photo is never held at full size.
 * - The canvas's RGBA is handed back as is (no RGB copy), and encoding views
 *   it again without copying.
 * `ImageDecoder` is not used: Chromium applies EXIF orientation there.
 */
export const canvasCodec: ImageCodec = {
  async decodeJpeg(bytes, size) {
    const bitmap = await createImageBitmap(
      new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }),
      {
        colorSpaceConversion: 'none',
        premultiplyAlpha: 'none',
        imageOrientation: 'none',
        ...(size
          ? {
              resizeWidth: size.width,
              resizeHeight: size.height,
              resizeQuality: 'high' as const,
            }
          : {}),
      },
    );
    try {
      const { width, height } = bitmap;
      const canvas = new OffscreenCanvas(width, height);
      const g = canvas.getContext('2d', { willReadFrequently: true });
      if (!g) throw new ToolError('UNKNOWN', 'Canvas is not available');
      g.drawImage(bitmap, 0, 0);
      const { data } = g.getImageData(0, 0, width, height);
      return {
        width,
        height,
        channels: 4,
        pixels: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
      };
    } finally {
      bitmap.close();
    }
  },
  async encodeJpeg(img, quality) {
    const canvas = new OffscreenCanvas(img.width, img.height);
    const g = canvas.getContext('2d');
    if (!g) throw new ToolError('UNKNOWN', 'Canvas is not available');
    g.putImageData(new ImageData(toRgba(img), img.width, img.height), 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    return { bytes: new Uint8Array(await blob.arrayBuffer()), channels: 3 };
  },
};
