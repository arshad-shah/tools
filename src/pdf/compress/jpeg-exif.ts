const EXIF_ID = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"

/**
 * The JPEG without its EXIF (APP1) segments. PDF viewers ignore EXIF inside a
 * DCT stream, but browser decoders apply its Orientation tag; stripping it
 * keeps decoded pixels exactly as the PDF shows them. Returns `bytes` itself
 * when there is nothing to strip or the marker structure is not understood.
 */
export function stripJpegExif(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const keep: [number, number][] = [[0, 2]];
  let i = 2;
  let stripped = false;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return bytes;
    const marker = bytes[i + 1];
    // Start of scan: the rest is entropy-coded data, copied as is.
    if (marker === 0xda) {
      keep.push([i, bytes.length]);
      break;
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    const end = i + 2 + length;
    if (length < 2 || end > bytes.length) return bytes;
    const isExif =
      marker === 0xe1 &&
      length >= 8 &&
      EXIF_ID.every((b, k) => bytes[i + 4 + k] === b);
    if (isExif) stripped = true;
    else keep.push([i, end]);
    i = end;
  }
  if (!stripped || keep[keep.length - 1][1] !== bytes.length) return bytes;
  const out = new Uint8Array(keep.reduce((n, [s, e]) => n + e - s, 0));
  let o = 0;
  for (const [s, e] of keep) {
    out.set(bytes.subarray(s, e), o);
    o += e - s;
  }
  return out;
}
