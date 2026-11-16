import { Badge, EmptyState, Stack, Table, Text } from '@arshad-shah/cynosure';
import type { CsvChange, JsonChange } from '../lib/semantic';

const TONE = {
  added: 'success',
  removed: 'danger',
  changed: 'warning',
} as const;

const show = (v: unknown) =>
  v === undefined
    ? ''
    : typeof v === 'string'
      ? JSON.stringify(v)
      : JSON.stringify(v);

function NoDifferences() {
  return (
    <EmptyState
      size="sm"
      title="No differences"
      description="Both sides hold the same data."
    />
  );
}

const mono = (text: string) => (
  <Text as="span" variant="code" wrap="break">
    {text}
  </Text>
);

/** JSON mode: one row per changed path. */
export function JsonChangesTable({ changes }: { changes: JsonChange[] }) {
  if (changes.length === 0) return <NoDifferences />;
  return (
    <Table
      caption="JSON differences"
      captionHidden
      getRowId={(c) => c.path}
      rows={changes}
      columns={[
        {
          key: 'path',
          header: 'Path',
          rowHeader: true,
          cell: (c) => mono(c.path),
        },
        {
          key: 'kind',
          header: 'Change',
          cell: (c) => <Badge tone={TONE[c.kind]}>{c.kind}</Badge>,
        },
        { key: 'left', header: 'Left', cell: (c) => mono(show(c.left)) },
        { key: 'right', header: 'Right', cell: (c) => mono(show(c.right)) },
      ]}
    />
  );
}

/** CSV mode: rows by key, with the cells that changed. */
export function CsvChangesTable({
  changes,
  keyColumn,
}: {
  changes: CsvChange[];
  keyColumn: string;
}) {
  if (changes.length === 0) return <NoDifferences />;
  return (
    <Table
      caption="CSV differences"
      captionHidden
      getRowId={(c) => `${c.kind}:${c.key}`}
      rows={changes}
      columns={[
        {
          key: 'key',
          header: keyColumn,
          rowHeader: true,
          cell: (c) => mono(c.key),
        },
        {
          key: 'kind',
          header: 'Change',
          cell: (c) => <Badge tone={TONE[c.kind]}>{c.kind}</Badge>,
        },
        {
          key: 'cells',
          header: 'Cells',
          cell: (c) => (
            <Stack gap="1">
              {c.cells?.map((cell) => (
                <Text key={cell.column} size="sm">
                  {cell.column}: {cell.left} to {cell.right}
                </Text>
              ))}
            </Stack>
          ),
        },
      ]}
    />
  );
}

/** Ignore-order mode: lines one side has more of. */
export function OrderlessTable({
  added,
  removed,
}: {
  added: string[];
  removed: string[];
}) {
  if (added.length === 0 && removed.length === 0) return <NoDifferences />;
  const rows = [
    ...removed.map((line, i) => ({ id: `r${i}`, side: 'left' as const, line })),
    ...added.map((line, i) => ({ id: `a${i}`, side: 'right' as const, line })),
  ];
  return (
    <Table
      caption="Line differences ignoring order"
      captionHidden
      getRowId={(r) => r.id}
      rows={rows}
      columns={[
        {
          key: 'side',
          header: 'Change',
          cell: (r) =>
            r.side === 'left' ? (
              <Badge tone="danger">only left</Badge>
            ) : (
              <Badge tone="success">only right</Badge>
            ),
        },
        { key: 'line', header: 'Line', cell: (r) => mono(r.line) },
      ]}
    />
  );
}
