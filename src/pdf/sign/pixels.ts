/** Near-white → transparent; a 24-level ramp below `threshold` avoids halos. */
export function removeWhiteBackground(
  rgba: Uint8ClampedArray,
  threshold = 235,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba);
  const ramp = 24;
  for (let i = 0; i < out.length; i += 4) {
    const m = Math.min(out[i], out[i + 1], out[i + 2]);
    if (m >= threshold) out[i + 3] = 0;
    else if (m > threshold - ramp)
      out[i + 3] = Math.round((out[i + 3] * (threshold - m)) / ramp);
  }
  return out;
}

export function opaqueBounds(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  minAlpha = 8,
) {
  let x0 = width,
    y0 = height,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] < minAlpha) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0
    ? null
    : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}
