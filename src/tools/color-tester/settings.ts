import { createToolSettings } from '@/shared/lib/tool-settings';

export type SavedPalette = {
  name: string;
  /** Hex colours. */
  colors: string[];
};

/** Configuration only: named palettes are the user's saved presets. */
export type ColorSettings = {
  palettes: SavedPalette[];
  lastColors: { base: string; fg: string; bg: string };
  scale: { hueShift: number; chromaCurve: number };
};

export const COLOR_DEFAULTS: ColorSettings = {
  palettes: [],
  lastColors: { base: '#3b82f6', fg: '#1f2937', bg: '#ffffff' },
  scale: { hueShift: 0, chromaCurve: 1 },
};

export const colorSettings = createToolSettings<ColorSettings>(
  'color-tester',
  COLOR_DEFAULTS,
  { version: 1 },
);
