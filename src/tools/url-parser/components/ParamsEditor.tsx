import { KeyValueEditor, type KeyValueRow } from '@/shared/ui';

/** Query params in order; duplicates and disabled rows supported. */
export function ParamsEditor({
  rows,
  onChange,
}: {
  rows: KeyValueRow[];
  onChange(rows: KeyValueRow[]): void;
}) {
  return (
    <KeyValueEditor
      rows={rows}
      onChange={onChange}
      ariaLabel="Query parameters"
      keyLabel="Name"
      valueLabel="Value"
    />
  );
}
