import React, { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button, IconButton } from './button';
import { Checkbox } from './controls';
import { FilePicker } from './file-upload';
import { IconEye, IconEyeOff, IconGripVertical, IconTrash2 } from './icons';
import { Input } from './input';
import { rowName } from './key-value-bulk';
import type { KeyValueRow, KeyValueType } from './key-value-bulk';
import { Select } from './select';
import type { SelectItem } from './select';
import { TableCell, TableRow } from './table';

interface KeyValueRowViewProps {
  row: KeyValueRow;
  index: number;
  keyLabel: string;
  valueLabel: string;
  /** Empty when only text values are allowed (no type column). */
  types: SelectItem[];
  onChange(row: KeyValueRow): void;
  onRemove(): void;
  onKeyDown(e: React.KeyboardEvent<HTMLTableRowElement>): void;
  rowRef(el: HTMLTableRowElement | null): void;
  keyRef(el: HTMLInputElement | null): void;
}

function FileValue({
  row,
  name,
  onChange,
}: {
  row: KeyValueRow;
  name: string;
  onChange(row: KeyValueRow): void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <FilePicker onFiles={([file]) => onChange({ ...row, file })}>
        {(open) => (
          <Button
            size="sm"
            variant="secondary"
            aria-label={`Choose file for ${name}`}
            onClick={open}
          >
            Choose file
          </Button>
        )}
      </FilePicker>
      <span
        className={cn(
          'min-w-0 truncate font-mono text-xs',
          row.file ? 'text-fg' : 'text-fg-muted',
        )}
      >
        {row.file ? row.file.name : 'No file chosen'}
      </span>
    </div>
  );
}

/** One editable row of a KeyValueEditor. */
export function KeyValueRowView({
  row,
  index,
  keyLabel,
  valueLabel,
  types,
  onChange,
  onRemove,
  onKeyDown,
  rowRef,
  keyRef,
}: KeyValueRowViewProps) {
  const [revealed, setRevealed] = useState(false);
  const name = rowName(row, index);
  const type = row.type ?? 'text';
  const valueName = `${valueLabel}, row ${index + 1}`;

  const setType = (next: KeyValueType) => {
    const updated: KeyValueRow = { ...row, type: next };
    if (next !== 'file') delete updated.file;
    onChange(updated);
  };

  return (
    <TableRow
      ref={rowRef}
      data-sortable-item
      tabIndex={0}
      aria-label={name}
      onKeyDown={onKeyDown}
      className={cn(
        'outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
        !row.enabled && 'text-fg-muted',
      )}
    >
      <TableCell className="w-8 px-1">
        <span
          data-drag-handle
          title="Drag to reorder"
          className="flex cursor-grab touch-none items-center justify-center text-fg-subtle"
        >
          <IconGripVertical size="sm" />
        </span>
      </TableCell>
      <TableCell className="w-10 px-1">
        <Checkbox
          checked={row.enabled}
          onCheckedChange={(enabled) => onChange({ ...row, enabled })}
          aria-label={`Enable ${name}`}
        />
      </TableCell>
      <TableCell className="min-w-32">
        <Input
          ref={keyRef}
          value={row.key}
          onChange={(key) => onChange({ ...row, key })}
          aria-label={`${keyLabel}, row ${index + 1}`}
          spellCheck={false}
          autoComplete="off"
          className="font-mono"
        />
      </TableCell>
      <TableCell className="min-w-40">
        {type === 'file' ? (
          <FileValue row={row} name={name} onChange={onChange} />
        ) : (
          <Input
            value={row.value}
            onChange={(value) => onChange({ ...row, value })}
            aria-label={valueName}
            type={type === 'secret' && !revealed ? 'password' : 'text'}
            spellCheck={false}
            autoComplete="off"
            className="font-mono"
            trailingSlot={
              type === 'secret' ? (
                <IconButton
                  size="sm"
                  variant="ghost"
                  className="-mr-2"
                  label={`Reveal ${name}`}
                  aria-pressed={revealed}
                  icon={revealed ? IconEyeOff : IconEye}
                  onClick={() => setRevealed((r) => !r)}
                />
              ) : undefined
            }
          />
        )}
      </TableCell>
      {types.length > 0 && (
        <TableCell className="w-28">
          <Select
            value={type}
            onValueChange={(v) => setType(v as KeyValueType)}
            items={types}
            aria-label={`Type of ${name}`}
            className="text-sm"
          />
        </TableCell>
      )}
      <TableCell className="w-10 px-1">
        <IconButton
          size="sm"
          variant="ghost"
          tone="danger"
          label={`Remove ${name}`}
          icon={IconTrash2}
          onClick={onRemove}
        />
      </TableCell>
    </TableRow>
  );
}
