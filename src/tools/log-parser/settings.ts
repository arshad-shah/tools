import { createToolSettings } from '@/shared/lib/tool-settings';

export const LOG_COLUMNS = ['line', 'time', 'level', 'component'] as const;
export type LogColumn = (typeof LOG_COLUMNS)[number];

// A type alias (not an interface) so it satisfies the settings Json bound.
export type SavedFormat = {
  name: string;
  pattern: string;
  flags: string;
};

export interface LogSettings {
  /** 'auto', a built-in format id, or `custom:<name>`. */
  format: string;
  /** Saved custom formats: name and pattern only (spec §8.1). */
  customFormats: SavedFormat[];
  columns: LogColumn[];
  wrap: boolean;
}

export const LOG_SETTINGS_DEFAULTS: LogSettings = {
  format: 'auto',
  customFormats: [],
  columns: [...LOG_COLUMNS],
  wrap: false,
};

/** Log Viewer options; never the log itself. */
export const logSettings = createToolSettings<LogSettings>(
  'log-parser',
  LOG_SETTINGS_DEFAULTS,
  { version: 1 },
);
