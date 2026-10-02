import { createToolSettings } from '@/shared/lib/tool-settings';
import type { Granularity } from './lib/engine';

export type DiffView = 'split' | 'unified' | 'inline';
export type DiffContext = 0 | 3 | 5 | 10 | 'all';
export type DiffMode = 'text' | 'json' | 'csv' | 'ignore-order';

export interface DiffSettings {
  granularity: Granularity;
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  ignoreBlankLines: boolean;
  trimTrailing: boolean;
  context: DiffContext;
  view: DiffView;
  mode: DiffMode;
  sortKeys: boolean;
  syntaxHighlighting: boolean;
}

export const DIFF_SETTINGS_DEFAULTS: DiffSettings = {
  granularity: 'word',
  ignoreWhitespace: false,
  ignoreCase: false,
  ignoreBlankLines: false,
  trimTrailing: false,
  context: 3,
  view: 'split',
  mode: 'text',
  sortKeys: false,
  syntaxHighlighting: true,
};

/** Every Text Diff option (spec §8.1); never the compared texts. */
export const diffSettings = createToolSettings<DiffSettings>(
  'text-diff-checker',
  DIFF_SETTINGS_DEFAULTS,
  { version: 1 },
);
