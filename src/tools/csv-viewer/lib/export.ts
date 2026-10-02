import {
  toCsv,
  toMarkdownTable,
  toNdjson,
  toSqlInsert,
  toXlsx,
  type SqlDialect,
} from '@/shared/lib/data-formats';

export const EXPORT_FORMATS = [
  'csv',
  'tsv',
  'json',
  'ndjson',
  'sql',
  'markdown',
  'xlsx',
] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_LABEL: Record<ExportFormat, string> = {
  csv: 'CSV',
  tsv: 'TSV',
  json: 'JSON (array)',
  ndjson: 'NDJSON',
  sql: 'SQL INSERT',
  markdown: 'Markdown table',
  xlsx: 'Excel (XLSX)',
};

const FORMAT_INFO: Record<ExportFormat, { mime: string; extension: string }> = {
  csv: { mime: 'text/csv', extension: 'csv' },
  tsv: { mime: 'text/tab-separated-values', extension: 'tsv' },
  json: { mime: 'application/json', extension: 'json' },
  ndjson: { mime: 'application/x-ndjson', extension: 'ndjson' },
  sql: { mime: 'application/sql', extension: 'sql' },
  markdown: { mime: 'text/markdown', extension: 'md' },
  xlsx: {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
  },
};

export interface ExportTable {
  /** Visible columns, in display order. */
  columns: string[];
  /** Filtered rows, in display order. */
  rows: readonly Record<string, unknown>[];
}

export interface ExportOptions {
  sqlDialect?: SqlDialect;
  sqlTable?: string;
  sqlBatch?: number;
}

export interface ExportedFile {
  bytes: Uint8Array;
  mime: string;
  extension: string;
}

/** Rows reduced to the visible columns, in column order. */
function project(t: ExportTable): Record<string, unknown>[] {
  return t.rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const c of t.columns) o[c] = r[c] ?? null;
    return o;
  });
}

function text(t: ExportTable, format: ExportFormat, opts: ExportOptions) {
  switch (format) {
    case 'csv':
      return toCsv(t.rows, { columns: t.columns });
    case 'tsv':
      return toCsv(t.rows, { columns: t.columns, delimiter: '\t' });
    case 'json':
      return JSON.stringify(project(t), null, 2) + '\n';
    case 'ndjson':
      return toNdjson(project(t));
    case 'sql':
      return toSqlInsert(t.rows, {
        table: opts.sqlTable ?? 'data',
        dialect: opts.sqlDialect ?? 'postgres',
        batch: opts.sqlBatch,
        columns: t.columns,
      });
    case 'markdown':
      return toMarkdownTable(t.rows, t.columns);
    case 'xlsx':
      return null;
  }
}

/** The visible, filtered table in one of the export formats. */
export function exportTable(
  t: ExportTable,
  format: ExportFormat,
  opts: ExportOptions = {},
): ExportedFile {
  const out = text(t, format, opts);
  const bytes =
    out === null ? toXlsx(t.rows, t.columns) : new TextEncoder().encode(out);
  return { bytes, ...FORMAT_INFO[format] };
}

/**
 * `<name>-filtered-<n>rows.<ext>` when a filter hides rows, else
 * `<name>.<ext>`; the source extension is dropped.
 */
export function exportFileName(
  sourceName: string,
  extension: string,
  filteredRows: number | null,
): string {
  const base = sourceName.replace(/\.[^./\\]+$/, '').trim() || 'data';
  return filteredRows === null
    ? `${base}.${extension}`
    : `${base}-filtered-${filteredRows}rows.${extension}`;
}
