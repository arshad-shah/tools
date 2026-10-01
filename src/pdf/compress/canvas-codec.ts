import { ToolError } from '@/shared/lib/errors';
import type { ImageCodec } from './codec';
import { toRgba } from './pixels';

interface Drawable {
  image: CanvasImageSource;
  width: number;
  height: number;
  close(): void;
}

async function drawable(bytes: Uint8Array): Promise<Drawable> {
  const data = bytes as Uint8Array<ArrayBuffer>;
  if (typeof ImageDecoder !== 'undefined') {
    const decoder = new ImageDecoder({
      data,
      type: 'image/jpeg',
      colorSpaceConversion: 'none',
    });
    try {
      const { image } = await decoder.decode();
      return {
        image,
        width: image.displayWidth,
        height: image.displayHeight,
        close: () => {
          image.close();
          decoder.close();
        },
      };
    } catch {
      decoder.close(); // fall through to createImageBitmap
    }
  }
  const bitmap = await createImageBitmap(
    new Blob([data], { type: 'image/jpeg' }),
    { colorSpaceConversion: 'none', premultiplyAlpha: 'none' },
  );
  return {
    image: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    close: () => bitmap.close(),
  };
}

/**
 * The browser/worker codec: exact pixels in, JPEG out. Colour management is
 * off, so sample values round-trip unchanged.
 */
export const canvasCodec: ImageCodec = {
  async decodeJpeg(bytes) {
    const src = await drawable(bytes);
    try {
      const canvas = new OffscreenCanvas(src.width, src.height);
      const g = canvas.getContext('2d', { willReadFrequently: true });
      if (!g) throw new ToolError('UNKNOWN', 'Canvas is not available');
      g.drawImage(src.image, 0, 0);
      const { data } = g.getImageData(0, 0, src.width, src.height);
      const rgb = new Uint8Array(src.width * src.height * 3);
      for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
        rgb[j] = data[i];
        rgb[j + 1] = data[i + 1];
        rgb[j + 2] = data[i + 2];
      }
      return { width: src.width, height: src.height, channels: 3, pixels: rgb };
    } finally {
      src.close();
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
