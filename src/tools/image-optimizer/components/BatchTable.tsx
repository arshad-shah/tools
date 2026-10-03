import React, { createContext, useContext } from 'react';
import { formatBytes } from '@/shared/lib/format';
import { Button, DataGrid, IconButton, type GridColumn } from '@/shared/ui';
import { IconDownload } from '@/shared/ui/icons';
import { notSmaller, savingPercent, type BatchRow } from '../lib/batch';
import { dims, formatSaving, statusText } from '../lib/status';

export interface BatchRowActions {
  onDownload(id: string): void;
  onKeepOriginal(id: string, keep: boolean): void;
}

const keepLabel = (r: BatchRow) =>
  r.keepOriginal ? 'Use compressed' : 'Keep original';

/**
 * Row actions reach the cells through context, so the columns stay one
 * constant (a new column identity would reset order and widths).
 */
const Actions = createContext<BatchRowActions | null>(null);

function RowActions({ row: r }: { row: BatchRow }) {
  const actions = useContext(Actions);
  if (!actions || r.status !== 'done') return null;
  return (
    <>
      <IconButton
        size="sm"
        variant="ghost"
        icon={IconDownload}
        label={`Download ${r.name}`}
        onClick={() => actions.onDownload(r.id)}
      />
      {notSmaller(r) && (
        <Button
          size="sm"
          variant="secondary"
          aria-label={`${r.keepOriginal ? 'Use compressed for' : 'Keep original for'} ${r.name}`}
          onClick={() => actions.onKeepOriginal(r.id, !r.keepOriginal)}
        >
          {keepLabel(r)}
        </Button>
      )}
    </>
  );
}

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
  {
    id: 'actions',
    header: 'Actions',
    minWidth: 200,
    accessor: (r) =>
      r.status !== 'done'
        ? ''
        : notSmaller(r)
          ? `Download, ${keepLabel(r)}`
          : 'Download',
    render: (r) => <RowActions row={r} />,
  },
];

export interface BatchTableProps extends BatchRowActions {
  rows: readonly BatchRow[];
  /** Enter on a row: compare it. */
  onSelect(id: string): void;
}

/**
 * One row per file: dimensions, sizes, saving, status, and the row actions
 * (download, and Keep original when the output is not smaller).
 */
export const BatchTable: React.FC<BatchTableProps> = ({
  rows,
  onSelect,
  onDownload,
  onKeepOriginal,
}) => {
  return (
    <Actions value={{ onDownload, onKeepOriginal }}>
      <DataGrid
        rows={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        ariaLabel="Files"
        onRowActivate={(r) => onSelect(r.id)}
        emptyLabel="No files yet"
      />
    </Actions>
  );
};
