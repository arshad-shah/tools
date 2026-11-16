import { KeyValueEditor } from '@arshad-shah/cynosure';
import type { KeyValueRow } from '../lib/model';

/** Query params in order; duplicates and switched-off rows kept. */
export function ParamsEditor({
  rows,
  onChange,
}: {
  rows: KeyValueRow[];
  onChange(rows: KeyValueRow[]): void;
}) {
  return (
    <KeyValueEditor
      label="Query parameters"
      toggleable
      bulkEdit
      labels={{ key: 'Name', value: 'Value' }}
      pairs={rows}
      onChange={(pairs) =>
        onChange(
          pairs.map((p) => ({
            id: p.id,
            enabled: p.enabled ?? true,
            key: p.key,
            value: p.value,
          })),
        )
      }
    />
  );
}
