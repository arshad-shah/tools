import {
  Badge,
  EmptyState,
  EmptyStateTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@/shared/ui';
import type { CsvChange, JsonChange } from '../lib/semantic';

const tone = {
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
    <EmptyState>
      <EmptyStateTitle>No differences</EmptyStateTitle>
    </EmptyState>
  );
}

/** JSON mode: one row per path that differs (spec §8.1). */
export function JsonChangesTable({ changes }: { changes: JsonChange[] }) {
  if (changes.length === 0) return <NoDifferences />;
  return (
    <Table aria-label="JSON differences">
      <TableHeader>
        <TableRow>
          <TableHead>Path</TableHead>
          <TableHead>Change</TableHead>
          <TableHead>Left</TableHead>
          <TableHead>Right</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {changes.map((c) => (
          <TableRow key={c.path}>
            <TableCell className="font-mono">{c.path}</TableCell>
            <TableCell>
              <Badge tone={tone[c.kind]}>{c.kind}</Badge>
            </TableCell>
            <TableCell className="font-mono break-all">
              {show(c.left)}
            </TableCell>
            <TableCell className="font-mono break-all">
              {show(c.right)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
    <Table aria-label="CSV differences">
      <TableHeader>
        <TableRow>
          <TableHead>{keyColumn}</TableHead>
          <TableHead>Change</TableHead>
          <TableHead>Cells</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {changes.map((c) => (
          <TableRow key={`${c.kind}:${c.key}`}>
            <TableCell className="font-mono">{c.key}</TableCell>
            <TableCell>
              <Badge tone={tone[c.kind]}>{c.kind}</Badge>
            </TableCell>
            <TableCell>
              {c.cells?.map((cell) => (
                <Text key={cell.column} size="sm">
                  {cell.column}: {cell.left} to {cell.right}
                </Text>
              ))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
  return (
    <Table aria-label="Line differences ignoring order">
      <TableHeader>
        <TableRow>
          <TableHead>Change</TableHead>
          <TableHead>Line</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {removed.map((l, i) => (
          <TableRow key={`r${i}`}>
            <TableCell>
              <Badge tone="danger">only left</Badge>
            </TableCell>
            <TableCell className="font-mono whitespace-pre">{l}</TableCell>
          </TableRow>
        ))}
        {added.map((l, i) => (
          <TableRow key={`a${i}`}>
            <TableCell>
              <Badge tone="success">only right</Badge>
            </TableCell>
            <TableCell className="font-mono whitespace-pre">{l}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
