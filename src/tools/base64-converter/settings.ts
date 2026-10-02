import { createToolSettings } from '@/shared/lib/tool-settings';

export interface Base64Settings {
  urlSafe: boolean;
  padding: boolean;
  wrap76: boolean;
  mode: 'encode' | 'decode';
  /** What a dropped file encodes to. */
  fileOutput: 'base64' | 'dataUri';
}

export const BASE64_DEFAULTS: Base64Settings = {
  urlSafe: false,
  padding: true,
  wrap76: false,
  mode: 'encode',
  fileOutput: 'base64',
};

/** Variants and the last mode (spec §8.3); never the input or output. */
export const base64Settings = createToolSettings<Base64Settings>(
  'base64-converter',
  BASE64_DEFAULTS,
  { version: 1 },
);
