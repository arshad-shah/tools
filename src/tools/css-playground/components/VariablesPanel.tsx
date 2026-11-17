import { EmptyState, Table, Text } from '@arshad-shah/cynosure';
import type { CustomProperty } from '../lib/types';

/** Custom properties (CSS variables) declared in the stylesheet. */
export function VariablesPanel({ variables }: { variables: CustomProperty[] }) {
  if (variables.length === 0)
    return (
      <EmptyState
        size="sm"
        title="No custom properties"
        description="Declarations such as --brand: #4f46e5 are listed here with their values."
      />
    );
  const rows = variables.map((v, i) => ({ ...v, id: String(i) }));
  return (
    <Table
      caption="Custom properties"
      captionHidden
      size="sm"
      stickyHeader
      getRowId={(v) => v.id}
      rows={rows}
      columns={[
        {
          key: 'name',
          header: 'Name',
          rowHeader: true,
          sortable: true,
          sortValue: (v) => v.name,
          cell: (v) => <Text variant="code">{v.name}</Text>,
        },
        {
          key: 'value',
          header: 'Value',
          cell: (v) => (
            <Text variant="code" wrap="break">
              {v.value}
            </Text>
          ),
        },
        {
          key: 'line',
          header: 'Line',
          align: 'end',
          sortable: true,
          sortValue: (v) => v.line ?? 0,
          cell: (v) => (v.line ? String(v.line) : ''),
        },
      ]}
    />
  );
}
