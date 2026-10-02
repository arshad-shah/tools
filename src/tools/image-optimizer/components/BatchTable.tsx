import React from 'react';
import { formatBytes } from '@/shared/lib/format';
import { DataGrid, type GridColumn } from '@/shared/ui';
import { savingPercent, type BatchRow } from '../lib/batch';
import { dims, formatSaving, statusText } from '../lib/status';

const COLUMNS: GridColumn<BatchRow>[] = [
  {
    id: 'name',
    header: 'Name',
    accessor: (r) => r.name,
    pinned: 'start',
  },
  {
    id: 'dimsBefore',
    header: 'Dimensions before',
    accessor: (r) => dims(r.before),
  },
  {
    id: 'dimsAfter',
    header: 'Dimensions after',
    accessor: (r) => dims(r.after),
  },
  {
    id: 'bytesBefore',
    header: 'Size before',
    accessor: (r) => formatBytes(r.before.bytes),
  },
  {
    id: 'bytesAfter',
    header: 'Size after',
    accessor: (r) => (r.after ? formatBytes(r.after.bytes) : ''),
  },
  {
    id: 'saving',
    header: 'Saving',
    accessor: (r) =>
      r.keepOriginal
        ? '0.0%'
        : formatSaving(savingPercent(r.before.bytes, r.after?.bytes)),
  },
  { id: 'status', header: 'Status', accessor: statusText },
];

export interface BatchTableProps {
  rows: readonly BatchRow[];
  /** Enter on a row: compare it. */
  onSelect(id: string): void;
}

/** One row per file: dimensions, sizes, saving and status. */
export const BatchTable: React.FC<BatchTableProps> = ({ rows, onSelect }) => {
  return (
    <DataGrid
      rows={rows}
      columns={COLUMNS}
      rowKey={(r) => r.id}
      ariaLabel="Files"
      onRowActivate={(r) => onSelect(r.id)}
      emptyLabel="No files yet"
    />
  );
};
