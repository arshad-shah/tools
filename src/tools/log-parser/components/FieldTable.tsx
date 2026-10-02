import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui';
import type { FieldFilter } from '../lib/filter';

export interface FieldTableProps {
  fields: Record<string, string>;
  onFilter(f: FieldFilter): void;
}

/** An entry's parsed fields, each with "Filter to" and "Exclude". */
export function FieldTable({ fields, onFilter }: FieldTableProps) {
  return (
    <Table className="text-sm">
      <TableHeader>
        <TableRow>
          <TableHead>Field</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.entries(fields).map(([key, value]) => (
          <TableRow key={key}>
            <TableCell className="font-mono text-fg-muted">{key}</TableCell>
            <TableCell className="font-mono break-all">{value}</TableCell>
            <TableCell className="whitespace-nowrap">
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Filter to ${key} ${value}`}
                onClick={() => onFilter({ key, value, mode: 'include' })}
              >
                Filter to
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Exclude ${key} ${value}`}
                onClick={() => onFilter({ key, value, mode: 'exclude' })}
              >
                Exclude
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
