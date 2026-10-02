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
const ascii = (b: Uint8Array, i: number, s: string) =>
  [...s].every((c, k) => b[i + k] === c.charCodeAt(0));

const valid = (s: Size): Size | null =>
  s.width > 0 && s.height > 0 ? s : null;

function jpegSize(b: Uint8Array): Size | null {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1];
    if (m === 0xff) {
      i++; // fill byte
      continue;
    }
    // Markers without a length field.
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd9)) {
      i += 2;
      continue;
    }
    const isSof =
      m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;
    if (isSof)
      return valid({ height: u16be(b, i + 5), width: u16be(b, i + 7) });
    i += 2 + u16be(b, i + 2);
  }
  return null;
}

function webpSize(b: Uint8Array): Size | null {
  if (ascii(b, 12, 'VP8 '))
    return valid({
      width: u16le(b, 26) & 0x3fff,
      height: u16le(b, 28) & 0x3fff,
    });
  if (ascii(b, 12, 'VP8L')) {
    const [b0, b1, b2, b3] = [b[21], b[22], b[23], b[24]];
    return valid({
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    });
  }
  if (ascii(b, 12, 'VP8X'))
    return valid({ width: 1 + u24le(b, 24), height: 1 + u24le(b, 27) });
  return null;
}

/**
 * Pixel size from a PNG, JPEG, WebP or GIF header, without decoding (jsdom
 * and the main thread have no cheap decoder). JPEG sizes are as stored,
 * before any EXIF orientation. Null when the header is not recognised.
 */
export function imageSize(b: Uint8Array): Size | null {
  if (b.length < 10) return null;
  if (b[0] === 0x89 && ascii(b, 1, 'PNG') && ascii(b, 12, 'IHDR'))
    return valid({ width: u32be(b, 16), height: u32be(b, 20) });
  if (ascii(b, 0, 'GIF8'))
    return valid({ width: u16le(b, 6), height: u16le(b, 8) });
  if (ascii(b, 0, 'RIFF') && ascii(b, 8, 'WEBP')) return webpSize(b);
  if (b[0] === 0xff && b[1] === 0xd8) return jpegSize(b);
  return null;
}

/** Enough of a file for its header (EXIF can push a JPEG SOF far in). */
const HEAD_BYTES = 512 * 1024;

export async function readImageSize(file: Blob): Promise<Size | null> {
  try {
    const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer());
    return imageSize(head);
  } catch {
    return null;
  }
}
