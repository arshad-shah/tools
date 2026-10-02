import type { SqlDialect } from '@/shared/lib/data-formats';
import { createToolSettings } from '@/shared/lib/tool-settings';
import type { TextEncodingChoice } from './lib/decode';
import type { ExportFormat } from './lib/export';
import type { DelimiterChoice } from './lib/parse';

export interface CsvSettings {
  density: 'comfortable' | 'compact';
  delimiterChoice: DelimiterChoice;
  encoding: TextEncodingChoice;
  exportFormat: ExportFormat;
  sqlDialect: SqlDialect;
  sqlTable: string;
}

export const CSV_SETTINGS_DEFAULTS: CsvSettings = {
  density: 'comfortable',
  delimiterChoice: 'auto',
  encoding: 'auto',
  exportFormat: 'csv',
  sqlDialect: 'postgres',
  sqlTable: 'data',
};

/** Options only; the table itself is never stored (spec §4.5). */
export const csvSettings = createToolSettings<CsvSettings>(
  'csv-viewer',
  CSV_SETTINGS_DEFAULTS,
  { version: 1 },
);
