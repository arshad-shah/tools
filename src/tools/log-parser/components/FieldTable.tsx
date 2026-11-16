import { Button, Inline, Table, Text } from '@arshad-shah/cynosure';
import type { FieldFilter } from '../lib/filter';

export interface FieldTableProps {
  fields: Record<string, string>;
  onFilter(f: FieldFilter): void;
}

type Row = [key: string, value: string];

/** An entry's parsed fields, each with "Filter to" and "Exclude". */
export function FieldTable({ fields, onFilter }: FieldTableProps) {
  return (
    <Table<Row>
      caption="Fields"
      captionHidden
      size="sm"
      rows={Object.entries(fields)}
      getRowId={([key]) => key}
      columns={[
        {
          key: 'field',
          header: 'Field',
          rowHeader: true,
          cell: ([key]) => (
            <Text variant="code" size="sm" tone="muted">
              {key}
            </Text>
          ),
        },
        {
          key: 'value',
          header: 'Value',
          cell: ([, value]) => (
            <Text variant="code" size="sm" wrap="break">
              {value}
            </Text>
          ),
        },
        {
          key: 'actions',
          header: 'Actions',
          align: 'end',
          cell: ([key, value]) => (
            <Inline gap="1" wrap={false} justify="end">
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
            </Inline>
          ),
        },
      ]}
    />
  );
}
