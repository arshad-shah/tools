export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'heic' | 'avif' | 'tiff';

const ascii = (b: Uint8Array, at: number, len: number) =>
  String.fromCharCode(...b.subarray(at, at + len));

/** The container format from magic bytes, or null. */
export function sniffImage(b: Uint8Array): ImageFormat | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (ascii(b, 0, 8) === '\x89PNG\r\n\x1a\n') return 'png';
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp';
  if (ascii(b, 0, 4) === 'II*\0' || ascii(b, 0, 4) === 'MM\0*') return 'tiff';
  if (ascii(b, 4, 4) === 'ftyp') {
    const brand = ascii(b, 8, 4);
    if (brand === 'avif' || brand === 'avis') return 'avif';
    if (/^(heic|heix|hevc|hevx|mif1|msf1)$/.test(brand)) return 'heic';
  }
  return null;
}

export interface RiffChunk {
  fourcc: string;
  /** Offset of the chunk header. */
  start: number;
  /** Offset of the payload. */
  data: number;
  size: number;
  /** Offset after the padded payload. */
  end: number;
}

/** The top-level chunks of a RIFF WebP (stops at a truncated chunk). */
export function riffChunks(b: Uint8Array): RiffChunk[] {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const out: RiffChunk[] = [];
  let at = 12;
  while (at + 8 <= b.length) {
    const size = v.getUint32(at + 4, true);
    const end = at + 8 + size + (size % 2);
    if (at + 8 + size > b.length) break;
    out.push({ fourcc: ascii(b, at, 4), start: at, data: at + 8, size, end });
    at = end;
  }
  return out;
}

/**
 * The file with its top-level ISO-BMFF boxes (HEIC, AVIF) checked, or null
 * when they do not tile the file. exifr loops forever on a zero or
 * undersized box, so damaged files are refused before it sees them; a final
 * "to the end of the file" box (size 0) is rewritten to its real size on a
 * copy.
 */
export function normalizeIsoBoxes(b: Uint8Array): Uint8Array | null {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let at = 0;
  while (at < b.length) {
    if (at + 8 > b.length) return null;
    let size = v.getUint32(at);
    let header = 8;
    if (size === 1) {
      if (at + 16 > b.length) return null;
      const big = v.getBigUint64(at + 8);
      if (big > BigInt(b.length)) return null;
      size = Number(big);
      header = 16;
    } else if (size === 0) {
      const rest = b.length - at;
      if (rest < 8) return null;
      const copy = b.slice();
      new DataView(copy.buffer).setUint32(at, rest);
      return copy;
    }
    if (size < header || at + size > b.length) return null;
    at += size;
  }
  return b;
}
