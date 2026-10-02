export interface QualitySearch {
  quality: number;
  bytes: number;
  met: boolean;
}

const round2 = (q: number) => Math.round(q * 100) / 100;

/**
 * Binary search for the largest quality whose encoded size fits `target`.
 * `encodeAt` must be (roughly) monotone in quality. At most `maxIter`
 * encodes: the maximum first (it often fits), then the minimum (if even that
 * is too big the target is impossible), then bisection between them.
 */
export async function searchQuality(
  encodeAt: (quality: number) => Promise<number>,
  target: number,
  { min = 0.3, max = 0.95, maxIter = 8 } = {},
): Promise<QualitySearch> {
  const top = await encodeAt(max);
  if (top <= target || maxIter < 2)
    return { quality: max, bytes: top, met: top <= target };
  const bottom = await encodeAt(min);
  if (bottom > target) return { quality: min, bytes: bottom, met: false };
  let lo = { quality: min, bytes: bottom };
  let hi = max;
  for (let i = 2; i < maxIter; i++) {
    const mid = round2((lo.quality + hi) / 2);
    if (mid <= lo.quality || mid >= hi) break;
    const bytes = await encodeAt(mid);
    if (bytes <= target) lo = { quality: mid, bytes };
    else hi = mid;
  }
  return { ...lo, met: true };
}
