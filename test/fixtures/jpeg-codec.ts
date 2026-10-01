import jpeg from 'jpeg-js';
import type { ImageCodec } from '@/pdf/compress/codec';
import { toRgba } from '@/pdf/compress/pixels';

/** Pure-JS codec for Node tests (the browser uses OffscreenCanvas). */
export const nodeJpegCodec: ImageCodec = {
  async decodeJpeg(bytes) {
    const d = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: false });
    const channels = d.data.length / (d.width * d.height);
    if (channels !== 1 && channels !== 3)
      throw new Error(`unexpected ${channels} channels`);
    return { width: d.width, height: d.height, channels, pixels: d.data };
  },
  async encodeJpeg(img, quality) {
    const out = jpeg.encode(
      { data: toRgba(img), width: img.width, height: img.height },
      Math.round(quality * 100),
    );
    return { bytes: new Uint8Array(out.data), channels: 3 };
  },
};
