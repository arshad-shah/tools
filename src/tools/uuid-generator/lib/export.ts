export type ExportFormat = 'txt' | 'csv' | 'json';

export const EXPORT_MIME: Record<ExportFormat, string> = {
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
};

/** Ids as a download: one per line (txt, single-column csv) or a JSON array. */
export function exportIds(
  ids: readonly string[],
  format: ExportFormat,
): string {
  if (format === 'json') return JSON.stringify(ids, null, 2) + '\n';
  return ids.join('\n') + '\n';
}

export const MIN_COUNT = 1;
export const MAX_COUNT = 10_000;

export const clampCount = (n: number) =>
  Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.floor(n) || MIN_COUNT));
