import { parseColor } from '@/shared/lib/colour';

export const COLOR_SHARE_VERSION = 1;

/** What a Color & Contrast link carries (spec §4.2): colours, palette, scale. */
export interface ColorShare {
  colors: { base: string; fg: string; bg: string };
  palette: string[];
  scale: { hueShift: number; chromaCurve: number };
}

export const MAX_SHARED_PALETTE = 32;

const isColour = (v: unknown): v is string => {
  if (typeof v !== 'string' || v.length > 64) return false;
  try {
    parseColor(v);
    return true;
  } catch {
    return false;
  }
};

const inRange = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

/** Hand-written validator for a decoded share state. */
export function parseColorShare(
  state: unknown,
  version: number,
): ColorShare | null {
  if (version !== COLOR_SHARE_VERSION) return null;
  if (typeof state !== 'object' || state === null) return null;
  const { colors, palette, scale } = state as Record<string, unknown>;
  if (typeof colors !== 'object' || colors === null) return null;
  const { base, fg, bg } = colors as Record<string, unknown>;
  if (!isColour(base) || !isColour(fg) || !isColour(bg)) return null;
  if (
    !Array.isArray(palette) ||
    palette.length > MAX_SHARED_PALETTE ||
    !palette.every(isColour)
  )
    return null;
  if (typeof scale !== 'object' || scale === null) return null;
  const { hueShift, chromaCurve } = scale as Record<string, unknown>;
  if (!inRange(hueShift, -180, 180) || !inRange(chromaCurve, 0, 1)) return null;
  return {
    colors: { base, fg, bg },
    palette: [...palette],
    scale: { hueShift, chromaCurve },
  };
}
