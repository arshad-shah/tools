/**
 * EXIF orientation (1–8) of a JPEG, or 1 when it has none or the block is
 * unreadable. Cameras store photos sideways and set this tag; browsers apply
 * it when showing the image, so a PDF must too.
 */
export function jpegOrientation(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const len = bytes.length;
  if (len < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  let o = 2;
  while (o + 4 <= len) {
    if (bytes[o] !== 0xff) return 1;
    const marker = bytes[o + 1];
    // Standalone markers carry no length.
    if (marker === 0xff) {
      o++;
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      o += 2;
      continue;
    }
    // Start of scan / end of image: metadata segments come before these.
    if (marker === 0xda || marker === 0xd9) return 1;
    const size = view.getUint16(o + 2);
    if (size < 2 || o + 2 + size > len) return 1;
    if (marker === 0xe1) {
      const found = exifOrientation(view, o + 4, size - 2);
      if (found) return found;
    }
    o += 2 + size;
  }
  return 1;
}

/** Orientation from an APP1 payload starting at `start`, or 0. */
function exifOrientation(view: DataView, start: number, size: number): number {
  // "Exif\0\0"
  const sig = [0x45, 0x78, 0x69, 0x66, 0, 0];
  if (size < 14 || sig.some((b, i) => view.getUint8(start + i) !== b)) return 0;
  const tiff = start + 6;
  const end = start + size;
  const order = view.getUint16(tiff);
  if (order !== 0x4949 && order !== 0x4d4d) return 0;
  const le = order === 0x4949;
  if (view.getUint16(tiff + 2, le) !== 42) return 0;
  const ifd = tiff + view.getUint32(tiff + 4, le);
  if (ifd + 2 > end) return 0;
  const count = view.getUint16(ifd, le);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > end) return 0;
    if (view.getUint16(entry, le) !== 0x0112) continue;
    const value = view.getUint16(entry + 8, le);
    return value >= 1 && value <= 8 ? value : 0;
  }
  return 0;
}

/** True when the orientation swaps width and height. */
export const swapsAxes = (orientation: number) => orientation >= 5;

/**
 * Coefficients (dx, dy as affine functions of the stored image's column c
 * and row r, all in 0–1, rows top-down) of where each stored pixel is shown.
 */
const DISPLAY: Record<
  number,
  [number, number, number, number, number, number]
> = {
  1: [0, 1, 0, 0, 0, 1],
  2: [1, -1, 0, 0, 0, 1],
  3: [1, -1, 0, 1, 0, -1],
  4: [0, 1, 0, 1, 0, -1],
  5: [0, 0, 1, 0, 1, 0],
  6: [1, 0, -1, 0, 1, 0],
  7: [1, 0, -1, 1, -1, 0],
  8: [0, 0, 1, 1, -1, 0],
};

/**
 * The PDF `cm` matrix [a b c d e f] that draws an image (PDF image space is
 * the unit square, v up) so it appears upright in `box`, whose size is the
 * displayed (already swapped) size.
 */
export function orientationMatrix(
  orientation: number,
  box: { x: number; y: number; width: number; height: number },
): [number, number, number, number, number, number] {
  const [p0, p1, p2, q0, q1, q2] = DISPLAY[orientation] ?? DISPLAY[1];
  const { x, y, width: w, height: h } = box;
  // c = u, r = 1 - v; X = x + w*dx, Y = y + h*(1 - dy).
  return [
    w * p1,
    -h * q1,
    -w * p2,
    h * q2,
    x + w * (p0 + p2),
    y + h * (1 - q0 - q2),
  ].map((n) => n + 0) as [number, number, number, number, number, number];
}
