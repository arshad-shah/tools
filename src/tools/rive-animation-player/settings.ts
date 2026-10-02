import { createToolSettings } from '@/shared/lib/tool-settings';
import { alignValues, fitValues } from './lib/layout';
import type { AlignFitIndex } from './types';

export type RiveSettings = {
  /** Any CSS colour shown behind the artboard. */
  background: string;
  checkerboard: boolean;
  /** Names from lib/layout (stable across reorderings of the lists). */
  fit: string;
  alignment: string;
  speed: number;
};

export const RIVE_DEFAULTS: RiveSettings = {
  background: 'transparent',
  checkerboard: false,
  fit: 'Cover',
  alignment: 'Center',
  speed: 1,
};

export const riveSettings = createToolSettings<RiveSettings>(
  'rive-animation-player',
  RIVE_DEFAULTS,
  { version: 1 },
);

const indexOr = (list: readonly string[], name: string, fallback: string) => {
  const i = list.indexOf(name);
  return i >= 0 ? i : list.indexOf(fallback);
};

export const toAlignFit = (s: RiveSettings): AlignFitIndex => ({
  fit: indexOr(fitValues, s.fit, RIVE_DEFAULTS.fit),
  alignment: indexOr(alignValues, s.alignment, RIVE_DEFAULTS.alignment),
});

export const fromAlignFit = (
  idx: AlignFitIndex,
): Pick<RiveSettings, 'fit' | 'alignment'> => ({
  fit: fitValues[idx.fit],
  alignment: alignValues[idx.alignment],
});
