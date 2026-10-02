import { newId } from '@/shared/lib/id';

export type KeyValueType = 'text' | 'secret' | 'file';

export interface KeyValueRow {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
  type?: KeyValueType;
  /** Set for `type: 'file'` rows. */
  file?: File;
  description?: string;
}

const DISABLED = '# ';

/** How a row is named in labels and announcements. */
export function rowName(row: KeyValueRow, index: number): string {
  return row.key.trim() || `row ${index + 1}`;
}

/** What a row shows as its value in bulk text (a file row: its name). */
function bulkValue(row: KeyValueRow): string {
  return row.type === 'file' ? (row.file?.name ?? '') : row.value;
}

/**
 * One `key: value` line per row; disabled rows are prefixed with `# `.
 * Secret values are written in plain text (the bulk view is an explicit
 * opt-in by the user).
 */
export function toBulkText(rows: readonly KeyValueRow[]): string {
  return rows
    .map((row) => {
      const line = `${row.key}: ${bulkValue(row)}`;
      return row.enabled ? line : `${DISABLED}${line}`;
    })
    .join('\n');
}

function parseLine(line: string): Omit<KeyValueRow, 'id'> {
  let text = line.trim();
  let enabled = true;
  if (text.startsWith('#')) {
    enabled = false;
    text = text.slice(1).trim();
  }
  const colon = text.indexOf(':');
  if (colon === -1) return { enabled, key: text, value: '' };
  return {
    enabled,
    key: text.slice(0, colon).trim(),
    value: text.slice(colon + 1).trim(),
  };
}

/**
 * Parses bulk text back into rows. Ids are reused by position so React
 * keys stay stable while typing. A row whose key is unchanged at its
 * position keeps its type, file and description (a file row's line holds
 * only the file name, so its file and empty value are kept as they were).
 */
export function fromBulkText(
  text: string,
  previous: readonly KeyValueRow[],
): KeyValueRow[] {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line, i) => {
      const parsed = parseLine(line);
      const prev = previous[i];
      if (!prev) return { id: newId(), ...parsed };
      if (prev.key !== parsed.key) return { id: prev.id, ...parsed };
      const row: KeyValueRow = { ...prev, enabled: parsed.enabled };
      if (prev.type !== 'file') row.value = parsed.value;
      return row;
    });
}
