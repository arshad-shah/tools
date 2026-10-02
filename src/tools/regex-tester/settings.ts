import { createToolSettings } from '@/shared/lib/tool-settings';

export const REGEX_MODES = ['match', 'replace', 'split', 'tests'] as const;
export type RegexMode = (typeof REGEX_MODES)[number];

export interface RegexSettings {
  flags: string;
  mode: RegexMode;
  cheatSheetOpen: boolean;
}

export const REGEX_SETTINGS_DEFAULTS: RegexSettings = {
  flags: 'g',
  mode: 'match',
  cheatSheetOpen: false,
};

/** Flags, last mode and the cheat-sheet state; never the pattern or text. */
export const regexSettings = createToolSettings<RegexSettings>(
  'regex-tester',
  REGEX_SETTINGS_DEFAULTS,
  { version: 1 },
);
