import { CopyButton, Table, Text } from '@arshad-shah/cynosure';
import React from 'react';

/** Label, value (monospace) and Copy, one row each. */
export const ValueTable: React.FC<{
  caption: string;
  rows: { label: string; value: string }[];
}> = ({ caption, rows }) => (
  <Table
    caption={caption}
    captionHidden
    size="sm"
    rows={rows}
    getRowId={(r) => r.label}
    columns={[
      { key: 'label', header: 'Format', rowHeader: true, cell: (r) => r.label },
      {
        key: 'value',
        header: 'Value',
        cell: (r) => (
          <Text as="span" variant="code" wrap="break">
            {r.value}
          </Text>
        ),
      },
      {
        key: 'copy',
        header: 'Copy',
        align: 'end',
        width: '3rem',
        cell: (r) => (
          <CopyButton
            size="sm"
            value={r.value}
            labels={{ copy: `Copy ${r.label}`, copied: `Copied ${r.label}` }}
          />
        ),
      },
    ]}
  />
);
