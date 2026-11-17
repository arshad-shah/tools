import type { KeyValuePair } from '@arshad-shah/cynosure';
import type { KvRow } from './model';

/** Request rows as Cynosure KeyValueEditor pairs. */
export function toPairs(rows: readonly KvRow[]): KeyValuePair[] {
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    value: r.value,
    enabled: r.enabled,
    secret: r.type === 'secret' || undefined,
    file: r.type === 'file' ? r.file : undefined,
  }));
}

/**
 * Edited pairs back as request rows. A row keeps its description and its
 * secret flag (the editor does not change either); a file value makes it a
 * file row.
 */
export function fromPairs(
  pairs: readonly KeyValuePair[],
  previous: readonly KvRow[],
): KvRow[] {
  return pairs.map((p) => {
    const was = previous.find((r) => r.id === p.id);
    const row: KvRow = {
      id: p.id,
      enabled: p.enabled !== false,
      key: p.key,
      value: p.value,
      type: p.file
        ? 'file'
        : p.secret || was?.type === 'secret'
          ? 'secret'
          : 'text',
    };
    if (p.file) row.file = p.file;
    if (was?.description) row.description = was.description;
    return row;
  });
}
