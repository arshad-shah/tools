import { ToolError } from '@/shared/lib/errors';

export interface StripResult {
  bytes: Uint8Array;
  /** What was removed, for the report ("EXIF", "XMP", ...). */
  removed: string[];
}

const ascii = (b: Uint8Array, at: number, len: number) =>
  String.fromCharCode(...b.subarray(at, Math.min(b.length, at + len)));

/** Markers that stand alone, without a length field. */
const standalone = (m: number) =>
  m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7);

function exifOrientation(body: Uint8Array): number | null {
  if (ascii(body, 0, 6) !== 'Exif\0\0') return null;
  const t = body.subarray(6);
  if (t.length < 8) return null;
  const le = ascii(t, 0, 2) === 'II';
  const v = new DataView(t.buffer, t.byteOffset, t.byteLength);
  const ifd = v.getUint32(4, le);
  if (ifd + 2 > t.length) return null;
  const n = v.getUint16(ifd, le);
  for (let i = 0; i < n; i++) {
    const o = ifd + 2 + i * 12;
    if (o + 12 > t.length) break;
    if (v.getUint16(o, le) === 0x0112) return v.getUint16(o + 8, le);
  }
  return null;
}

/** An APP1 Exif segment holding only an Orientation tag (big endian). */
export function orientationSegment(orientation: number): Uint8Array {
  const out = new Uint8Array(4 + 6 + 26);
  const v = new DataView(out.buffer);
  out.set([0xff, 0xe1]);
  v.setUint16(2, out.length - 2);
  out.set([0x45, 0x78, 0x69, 0x66, 0, 0], 4); // "Exif\0\0"
  const t = 10;
  out.set([0x4d, 0x4d], t); // "MM"
  v.setUint16(t + 2, 42);
  v.setUint32(t + 4, 8);
  v.setUint16(t + 8, 1);
  v.setUint16(t + 10, 0x0112);
  v.setUint16(t + 12, 3);
  v.setUint32(t + 14, 1);
  v.setUint16(t + 18, orientation);
  v.setUint32(t + 22, 0);
  return out;
}

function describe(marker: number, body: Uint8Array): string | null {
  if (marker === 0xfe) return 'Comment';
  if (marker === 0xe1) {
    if (ascii(body, 0, 6) === 'Exif\0\0') return 'EXIF';
    if (ascii(body, 0, 4) === 'http') return 'XMP';
    return 'APP1';
  }
  if (marker === 0xed) return 'IPTC';
  if (marker === 0xe2)
    return ascii(body, 0, 12) === 'ICC_PROFILE\0' ? 'ICC profile' : 'APP2';
  if (marker >= 0xe3 && marker <= 0xef && marker !== 0xee)
    return `APP${marker - 0xe0}`;
  return null;
}

/**
 * Lossless JPEG metadata removal: walks the segments up to the scan and
 * drops APP1 (EXIF, XMP), APP13 (IPTC), COM and the other metadata APPn
 * segments. JFIF (APP0) and Adobe (APP14) colour information stay, as does
 * the ICC profile unless `keepIcc` is false. The scan data is copied
 * byte for byte. `keepOrientation` writes back a minimal APP1 with only the
 * original Orientation, so viewers still show the photo upright.
 */
export function stripJpeg(
  bytes: Uint8Array,
  { keepIcc = true, keepOrientation = false } = {},
): StripResult {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8)
    throw new ToolError('INVALID_FILE', 'This is not a JPEG file');
  const kept: Uint8Array[] = [bytes.subarray(0, 2)];
  const removed: string[] = [];
  let orientation: number | null = null;
  let insertAt = 1;
  let at = 2;
  for (;;) {
    if (at + 1 >= bytes.length)
      throw new ToolError(
        'INVALID_FILE',
        'This JPEG ends before its image data',
      );
    if (bytes[at] !== 0xff)
      throw new ToolError('INVALID_FILE', 'This JPEG has a damaged segment');
    const marker = bytes[at + 1];
    if (marker === 0xff) {
      at++; // fill byte
      continue;
    }
    if (standalone(marker)) {
      kept.push(bytes.subarray(at, at + 2));
      at += 2;
      continue;
    }
    if (marker === 0xda || marker === 0xd9) {
      kept.push(bytes.subarray(at)); // the scan onwards, untouched
      break;
    }
    if (at + 4 > bytes.length)
      throw new ToolError('INVALID_FILE', 'This JPEG has a damaged segment');
    const len = (bytes[at + 2] << 8) | bytes[at + 3];
    const end = at + 2 + len;
    if (len < 2 || end > bytes.length)
      throw new ToolError('INVALID_FILE', 'This JPEG has a damaged segment');
    const body = bytes.subarray(at + 4, end);
    const what = describe(marker, body);
    const drop = what !== null && !(what === 'ICC profile' && keepIcc);
    if (drop) {
      if (what === 'EXIF') orientation ??= exifOrientation(body);
      if (!removed.includes(what)) removed.push(what);
    } else {
      kept.push(bytes.subarray(at, end));
      if (marker === 0xe0) insertAt = kept.length; // after JFIF
    }
    at = end;
  }
  if (keepOrientation && orientation !== null && orientation !== 1)
    kept.splice(insertAt, 0, orientationSegment(orientation));
  const out = new Uint8Array(kept.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of kept) {
    out.set(p, o);
    o += p.length;
  }
  return { bytes: out, removed };
}
