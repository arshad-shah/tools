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
    width: 200,
    pinned: 'start',
  },
  {
    id: 'dimsBefore',
    header: 'Dimensions before',
    accessor: (r) => dims(r.before),
    width: 140,
  },
  {
    id: 'dimsAfter',
    header: 'Dimensions after',
    accessor: (r) => dims(r.after),
    width: 140,
  },
  {
    id: 'bytesBefore',
    header: 'Size before',
    accessor: (r) => formatBytes(r.before.bytes),
    width: 110,
  },
  {
    id: 'bytesAfter',
    header: 'Size after',
    accessor: (r) => (r.after ? formatBytes(r.after.bytes) : ''),
    width: 110,
  },
  {
    id: 'saving',
    header: 'Saving',
    accessor: (r) =>
      r.keepOriginal
        ? '0.0%'
        : formatSaving(savingPercent(r.before.bytes, r.after?.bytes)),
    width: 120,
  },
  { id: 'status', header: 'Status', accessor: statusText, width: 320 },
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
      height={Math.min(400, 40 + rows.length * 32)}
      emptyLabel="No files yet"
    />
  );
};
