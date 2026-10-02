import { ToolError } from '@/shared/lib/errors';
import type { StripResult } from './jpeg';

const METADATA = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

/**
 * Lossless PNG metadata removal: drops eXIf, tEXt, zTXt, iTXt and tIME
 * (and iCCP unless `keepIcc`). Kept chunks, CRCs included, are copied as is.
 */
export function stripPng(
  bytes: Uint8Array,
  { keepIcc = true } = {},
): StripResult {
  if (bytes.length < 8 || bytes[1] !== 0x50 || bytes[2] !== 0x4e)
    throw new ToolError('INVALID_FILE', 'This is not a PNG file');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const kept: Uint8Array[] = [bytes.subarray(0, 8)];
  const removed: string[] = [];
  let at = 8;
  while (at < bytes.length) {
    if (at + 12 > bytes.length)
      throw new ToolError('INVALID_FILE', 'This PNG has a damaged chunk');
    const len = v.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    const end = at + 12 + len;
    if (end > bytes.length)
      throw new ToolError('INVALID_FILE', 'This PNG has a damaged chunk');
    const drop = METADATA.has(type) || (type === 'iCCP' && !keepIcc);
    if (drop) {
      if (!removed.includes(type)) removed.push(type);
    } else kept.push(bytes.subarray(at, end));
    at = end;
    if (type === 'IEND') break;
  }
  const out = new Uint8Array(kept.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of kept) {
    out.set(p, o);
    o += p.length;
  }
  return { bytes: out, removed };
}
