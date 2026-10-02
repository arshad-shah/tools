import type { ImageEncoding } from '@/shared/lib/image/pipeline';

/** The longest side of the sample each format is encoded at. */
export const SAMPLE_MAX = 512;

export interface FormatEstimate {
  encoding: ImageEncoding;
  /** Estimated full-size bytes, or null when this browser cannot encode it. */
  bytes: number | null;
}

/**
 * Scales a sample's encoded size up to the full image by pixel count. A
 * rough figure (compression is not linear in area), always labelled
 * "estimate" in the UI.
 */
export function scaleEstimate(
  sampleBytes: number,
  sample: { width: number; height: number },
  full: { width: number; height: number },
): number {
  const ratio = (full.width * full.height) / (sample.width * sample.height);
  return Math.round(sampleBytes * Math.max(1, ratio));
}

/** The encoding with the smallest estimate, ignoring unsupported ones. */
export function smallestEstimate(
  list: readonly FormatEstimate[],
): ImageEncoding | null {
  let best: FormatEstimate | null = null;
  for (const e of list)
    if (
      e.bytes !== null &&
      (best === null || e.bytes < (best.bytes ?? Infinity))
    )
      best = e;
  return best?.encoding ?? null;
}
