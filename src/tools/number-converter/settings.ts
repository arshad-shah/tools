import { createToolSettings } from '@/shared/lib/tool-settings';

export type NumberSettings = {
  bits: 8 | 16 | 32 | 64;
  signed: boolean;
  customBase: number;
  fractionPrecision: number;
};

export const NUMBER_DEFAULTS: NumberSettings = {
  bits: 32,
  signed: false,
  customBase: 36,
  fractionPrecision: 20,
};

/** Width, signedness and the custom base (spec §8.5); never the value. */
export const numberSettings = createToolSettings(
  'number-converter',
  NUMBER_DEFAULTS,
  { version: 1 },
);
