import { unzlibSync } from 'fflate';
import type { RawImage } from '@/pdf/compress/codec';
import { unpredictPng } from '@/pdf/compress/pixels';

/** Flate data to 8-bit samples (PNG predictors undone); null when broken or unsupported. */
export function inflate(
  data: Uint8Array,
  p: { predictor: number; colors: number; columns: number; bpc: number } | null,
  comps: number,
  width: number,
): Uint8Array | null {
  let out: Uint8Array;
  try {
    out = unzlibSync(data);
  } catch {
    return null;
  }
  if (!p || p.predictor === 1) return out;
  // TIFF predictor 2 is rare in images we patch: turned into an image instead.
  if (
    p.predictor < 10 ||
    p.bpc !== 8 ||
    p.colors !== comps ||
    p.columns !== width
  )
    return null;
  try {
    return unpredictPng(out, p.columns, p.colors, 8);
  } catch {
    return null;
  }
}

/** A codec's output as tightly packed samples of `comps` components. */
export function toComps(raw: RawImage, comps: 1 | 3): Uint8Array {
  const n = raw.width * raw.height;
  if (raw.channels === comps) return raw.pixels;
  const out = new Uint8Array(n * comps);
  for (let i = 0; i < n; i++) {
    const s = i * raw.channels;
    if (raw.channels === 1) {
      out[i * 3] = out[i * 3 + 1] = out[i * 3 + 2] = raw.pixels[s];
      continue;
    }
    const [r, g, b] = [raw.pixels[s], raw.pixels[s + 1], raw.pixels[s + 2]];
    if (comps === 1) out[i] = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    else {
      out[i * 3] = r;
      out[i * 3 + 1] = g;
      out[i * 3 + 2] = b;
    }
  }
  return out;
}
