import { ToolError } from '@/shared/lib/errors';

export interface IcoImage {
  size: 16 | 32 | 48 | 64 | 128 | 256;
  /** A PNG file. */
  bytes: Uint8Array;
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47];

/**
 * An ICO file with PNG payloads (Vista+ format): a 6-byte ICONDIR, one
 * 16-byte entry per image, then the PNGs back to back.
 */
export function writeIco(pngs: readonly IcoImage[]): Uint8Array {
  if (pngs.length === 0)
    throw new ToolError('INVALID_INPUT', 'An icon needs at least one image');
  for (const p of pngs)
    if (!PNG_SIG.every((b, i) => p.bytes[i] === b))
      throw new ToolError(
        'INVALID_INPUT',
        `The ${p.size} px image is not a PNG`,
      );
  const header = 6 + 16 * pngs.length;
  const total = header + pngs.reduce((n, p) => n + p.bytes.length, 0);
  const out = new Uint8Array(total);
  const v = new DataView(out.buffer);
  v.setUint16(0, 0, true); // reserved
  v.setUint16(2, 1, true); // type: icon
  v.setUint16(4, pngs.length, true);
  let offset = header;
  pngs.forEach((p, i) => {
    const e = 6 + i * 16;
    out[e] = p.size >= 256 ? 0 : p.size; // 0 means 256
    out[e + 1] = p.size >= 256 ? 0 : p.size;
    out[e + 2] = 0; // palette colours
    out[e + 3] = 0; // reserved
    v.setUint16(e + 4, 1, true); // planes
    v.setUint16(e + 6, 32, true); // bits per pixel
    v.setUint32(e + 8, p.bytes.length, true);
    v.setUint32(e + 12, offset, true);
    out.set(p.bytes, offset);
    offset += p.bytes.length;
  });
  return out;
}

/** Reads back an ICO directory (tests and verification). */
export function readIcoDirectory(
  bytes: Uint8Array,
): { width: number; height: number; size: number; offset: number }[] {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (v.getUint16(0, true) !== 0 || v.getUint16(2, true) !== 1)
    throw new ToolError('INVALID_FILE', 'This is not an ICO file');
  const n = v.getUint16(4, true);
  return Array.from({ length: n }, (_, i) => {
    const e = 6 + i * 16;
    return {
      width: bytes[e] || 256,
      height: bytes[e + 1] || 256,
      size: v.getUint32(e + 8, true),
      offset: v.getUint32(e + 12, true),
    };
  });
}
