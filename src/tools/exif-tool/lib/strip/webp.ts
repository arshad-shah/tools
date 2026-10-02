import { ToolError } from '@/shared/lib/errors';
import { riffChunks } from '../format';
import type { StripResult } from './jpeg';

const FLAG_EXIF = 0x08;
const FLAG_XMP = 0x04;

/**
 * Lossless WebP metadata removal: drops the EXIF and XMP chunks, clears
 * their VP8X flags and rewrites the RIFF size. Image chunks are untouched.
 */
export function stripWebp(bytes: Uint8Array): StripResult {
  const chunks = riffChunks(bytes);
  if (
    String.fromCharCode(...bytes.subarray(0, 4)) !== 'RIFF' ||
    String.fromCharCode(...bytes.subarray(8, 12)) !== 'WEBP' ||
    chunks.length === 0
  )
    throw new ToolError('INVALID_FILE', 'This is not a WebP file');
  const removed: string[] = [];
  const kept: Uint8Array[] = [];
  for (const c of chunks) {
    if (c.fourcc === 'EXIF' || c.fourcc === 'XMP ') {
      removed.push(c.fourcc.trim());
      continue;
    }
    let chunk = bytes.subarray(c.start, c.end);
    if (c.fourcc === 'VP8X') {
      chunk = chunk.slice();
      chunk[8] &= ~(FLAG_EXIF | FLAG_XMP);
    }
    kept.push(chunk);
  }
  const size = kept.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(12 + size);
  out.set(bytes.subarray(0, 12));
  new DataView(out.buffer).setUint32(4, size + 4, true);
  let o = 12;
  for (const p of kept) {
    out.set(p, o);
    o += p.length;
  }
  return { bytes: out, removed };
}
