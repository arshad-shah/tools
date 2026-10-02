import UPNG from 'upng-js';

/**
 * Lossy "PNG (256 colours)": quantises RGBA pixels to a palette of at most
 * `colours` entries (UPNG's median cut) and writes an indexed PNG.
 */
export function encodePalettePng(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  colours = 256,
): Uint8Array {
  const buffer = rgba.buffer.slice(
    rgba.byteOffset,
    rgba.byteOffset + rgba.byteLength,
  ) as ArrayBuffer;
  return new Uint8Array(UPNG.encode([buffer], width, height, colours));
}
