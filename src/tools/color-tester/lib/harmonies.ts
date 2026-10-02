import {
  DEFAULT_STEPS,
  formatColor,
  scale as buildScale,
  fromOklch,
  gamutMap,
  simulateCvd,
  toOklch,
  type Color,
  type CvdType,
} from '@/shared/lib/colour';
import type { PaletteEntry } from './palette-export';

export type HarmonyKind =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'split'
  | 'tetradic';

export interface Harmony {
  kind: HarmonyKind;
  label: string;
  /** Hex colours, the base first. */
  colors: string[];
}

const TURNS: Record<HarmonyKind, { label: string; turns: number[] }> = {
  complementary: { label: 'Complementary', turns: [180] },
  analogous: { label: 'Analogous', turns: [-30, 30] },
  triadic: { label: 'Triadic', turns: [120, 240] },
  split: { label: 'Split complementary', turns: [150, 210] },
  tetradic: { label: 'Tetradic', turns: [90, 180, 270] },
};

/** Harmonies by OKLCH hue rotation (lightness and chroma kept). */
export function harmonies(base: Color): Harmony[] {
  const { l, c, h, alpha } = toOklch(base);
  const hex = (turn: number) =>
    formatColor(
      gamutMap(fromOklch(l, c, (((h + turn) % 360) + 360) % 360, alpha)),
      'hex',
    );
  return (Object.keys(TURNS) as HarmonyKind[]).map((kind) => ({
    kind,
    label: TURNS[kind].label,
    colors: [formatColor(gamutMap(base), 'hex'), ...TURNS[kind].turns.map(hex)],
  }));
}

export type CvdMode = 'none' | CvdType;

/** `c` as seen with `mode`, as hex (unchanged for 'none'). */
export function viewAs(c: Color, mode: CvdMode): string {
  return formatColor(mode === 'none' ? c : simulateCvd(c, mode), 'hex');
}

/** The scale steps of `base` as export entries. */
export function scaleEntries(
  base: Color,
  s: { hueShift: number; chromaCurve: number },
): PaletteEntry[] {
  const steps = buildScale(base, s);
  return DEFAULT_STEPS.map((step) => ({
    label: String(step),
    color: formatColor(steps[step], 'hex'),
  }));
}
