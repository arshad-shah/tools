import { useId } from 'react';
import type { MockTable } from '@/shared/lib/data-formats/mock-schema';
import {
  Button,
  Inline,
  Input,
  Label,
  NumberInput,
  Select,
  Switch,
} from '@/shared/ui';
import { IconPlus, IconTrash2 } from '@/shared/ui/icons';

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
  const ids = { pick: useId(), name: useId(), own: useId(), count: useId() };
  const t = tables[active];
  const patch = (p: Partial<MockTable>) =>
    onTables(tables.map((x, i) => (i === active ? { ...x, ...p } : x)));
  const fresh = () => {
    let n = tables.length + 1;
    while (tables.some((x) => x.name === `table${n}`)) n++;
    return `table${n}`;
  };

  return (
    <Inline gap="3" align="center" wrap>
      {tables.length > 1 && (
        <Inline gap="2" align="center" wrap={false}>
          <Label htmlFor={ids.pick}>Table</Label>
          <Select
            id={ids.pick}
            value={String(active)}
            onValueChange={(v) => onActive(Number(v))}
            items={tables.map((x, i) => ({ value: String(i), label: x.name }))}
          />
        </Inline>
      )}
      <Inline gap="2" align="center" wrap={false}>
        <Label htmlFor={ids.name}>Table name</Label>
        <Input
          id={ids.name}
          value={t.name}
          onChange={(name) => patch({ name })}
          className="w-36"
        />
      </Inline>
      {tables.length > 1 && (
        <Inline gap="2" align="center" wrap={false}>
          <Switch
            id={ids.own}
            checked={t.count !== undefined}
            onCheckedChange={(on) => patch({ count: on ? 50 : undefined })}
          />
          <Label htmlFor={ids.own}>Own row count</Label>
          {t.count !== undefined && (
            <NumberInput
              id={ids.count}
              aria-label="Table row count"
              value={t.count}
              min={0}
              max={1_000_000}
              onValueChange={(v) =>
                patch({ count: Math.max(0, Math.round(v)) })
              }
            />
          )}
        </Inline>
      )}
      <Button
        size="sm"
        variant="ghost"
        leftIcon={<IconPlus size="sm" />}
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
          leftIcon={<IconTrash2 size="sm" />}
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
