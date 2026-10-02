import { createToolSettings } from '@/shared/lib/tool-settings';
import type { SortMode } from './lib/lines';

export interface ToolkitSettings {
  locale: string;
  stopWords: boolean;
  sortMode: SortMode;
  dedupeCaseInsensitive: boolean;
  dedupeKeep: 'first' | 'last';
  numberStart: number;
  numberSep: string;
  prefix: string;
  suffix: string;
  filterInvert: boolean;
  joinSep: string;
  splitSep: string;
  slugSep: string;
  tabSize: number;
  findRegex: boolean;
  findCaseSensitive: boolean;
  findWholeWord: boolean;
}

export const TOOLKIT_SETTINGS_DEFAULTS: ToolkitSettings = {
  locale: 'en',
  stopWords: false,
  sortMode: 'az',
  dedupeCaseInsensitive: false,
  dedupeKeep: 'first',
  numberStart: 1,
  numberSep: '. ',
  prefix: '',
  suffix: '',
  filterInvert: false,
  joinSep: ', ',
  splitSep: ',',
  slugSep: '-',
  tabSize: 2,
  findRegex: false,
  findCaseSensitive: false,
  findWholeWord: false,
};

/** The last operation options (spec §9.1); never the text. */
export const toolkitSettings = createToolSettings<ToolkitSettings>(
  'text-toolkit',
  TOOLKIT_SETTINGS_DEFAULTS,
  { version: 1 },
);
