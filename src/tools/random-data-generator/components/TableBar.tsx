import {
  Button,
  Inline,
  NumberField,
  Select,
  Switch,
  TextField,
} from '@arshad-shah/cynosure';
import { plus, trash } from '@arshad-shah/cynosure/icons';
import type { MockTable } from '@/shared/lib/data-formats/mock-schema';

interface TableBarProps {
  tables: readonly MockTable[];
  active: number;
  onActive(i: number): void;
  onTables(tables: MockTable[]): void;
}

/** Pick, add, rename and remove tables; a table may fix its own row count. */
export function TableBar({
  tables,
  active,
  onActive,
  onTables,
}: TableBarProps) {
  const t = tables[active];
  const patch = (p: Partial<MockTable>) =>
    onTables(tables.map((x, i) => (i === active ? { ...x, ...p } : x)));
  const fresh = () => {
    let n = tables.length + 1;
    while (tables.some((x) => x.name === `table${n}`)) n++;
    return `table${n}`;
  };

  return (
    <Inline gap="3" align="end" wrap>
      {tables.length > 1 && (
        <Select
          size="sm"
          label="Table"
          value={String(active)}
          onChange={(v) => onActive(Number(v))}
          options={tables.map((x, i) => ({ value: String(i), label: x.name }))}
        />
      )}
      <TextField
        size="sm"
        label="Table name"
        value={t.name}
        onChange={(name) => patch({ name })}
      />
      {tables.length > 1 && (
        <Switch
          size="sm"
          label="Own row count"
          checked={t.count !== undefined}
          onChange={(on) => patch({ count: on ? 50 : undefined })}
        />
      )}
      {tables.length > 1 && t.count !== undefined && (
        <NumberField
          size="sm"
          label="Table row count"
          value={t.count}
          min={0}
          max={1_000_000}
          onChange={(v) =>
            v !== null && patch({ count: Math.max(0, Math.round(v)) })
          }
        />
      )}
      <Button
        size="sm"
        variant="ghost"
        icon={plus}
        onClick={() => {
          onTables([
            ...tables,
            { name: fresh(), fields: [{ name: 'id', type: 'uuid' }] },
          ]);
          onActive(tables.length);
        }}
      >
        Add table
      </Button>
      {tables.length > 1 && (
        <Button
          size="sm"
          variant="ghost"
          icon={trash}
          onClick={() => {
            onTables(tables.filter((_, i) => i !== active));
            onActive(0);
          }}
        >
          Remove table
        </Button>
      )}
    </Inline>
  );
}
