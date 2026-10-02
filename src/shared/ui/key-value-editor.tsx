import React, { useEffect, useRef, useState } from 'react';
import { useSortable } from '@arshad-shah/detent-react';
import { cn } from '@/shared/lib/cn';
import { newId } from '@/shared/lib/id';
import { Button } from './button';
import { CodeSurface } from './code-surface';
import { IconList, IconPlus } from './icons';
import { fromBulkText, rowName, toBulkText } from './key-value-bulk';
import type { KeyValueRow } from './key-value-bulk';
import { KeyValueRowView } from './key-value-row';
import type { SelectItem } from './select';
import { Table, TableBody, TableHead, TableHeader, TableRow } from './table';

export interface KeyValueEditorProps {
  rows: KeyValueRow[];
  onChange(rows: KeyValueRow[]): void;
  /** Offer a File value type (a file picker per row). */
  allowFiles?: boolean;
  /** Offer a Secret value type (masked, with a reveal toggle). */
  allowSecret?: boolean;
  keyLabel?: string;
  valueLabel?: string;
  /** Show the toggle to a `key: value` text view. Default true. */
  bulkEdit?: boolean;
  /** Accessible name of the table, e.g. "Headers". */
  ariaLabel: string;
  className?: string;
}

const ITEM = '[data-sortable-item]';

function moveRow<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * detent moves the dragged node itself; put it back so React stays the only
 * owner of DOM order, then re-render from the reordered rows.
 */
function restoreDomOrder(
  container: HTMLElement,
  item: HTMLElement,
  at: number,
) {
  const siblings = Array.from(
    container.querySelectorAll<HTMLElement>(`:scope > ${ITEM}`),
  ).filter((el) => el !== item);
  container.insertBefore(
    item,
    siblings[at] ?? siblings[siblings.length - 1]?.nextSibling ?? null,
  );
}

/**
 * Editable key/value rows (HTTP headers, query parameters, form fields):
 * per-row enable toggle, optional secret and file values, duplicate keys,
 * reorder by dragging the grip or with Alt+ArrowUp/Down on a focused row,
 * and a bulk `key: value` text view where disabled rows start with `# `.
 */
export function KeyValueEditor({
  rows,
  onChange,
  allowFiles = false,
  allowSecret = false,
  keyLabel = 'Key',
  valueLabel = 'Value',
  bulkEdit = true,
  ariaLabel,
  className,
}: KeyValueEditorProps) {
  const [bulk, setBulk] = useState(false);
  const [draft, setDraft] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const rowNodes = useRef(new Map<string, HTMLTableRowElement>());
  const keyNodes = useRef(new Map<string, HTMLInputElement>());
  const pendingFocus = useRef<{ id: string; target: 'row' | 'key' } | null>(
    null,
  );
  // detent's handler is bound once; read the latest rows through a ref.
  const latest = useRef({ rows, onChange });
  useEffect(() => {
    latest.current = { rows, onChange };
  });

  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const nodes = pending.target === 'row' ? rowNodes : keyNodes;
    nodes.current.get(pending.id)?.focus();
  }, [rows]);

  const sortableRef = useSortable({
    items: ITEM,
    handle: '[data-drag-handle]',
    direction: 'y',
    animation: 150,
    keyboard: false,
    onSort: ({ item, from, to }) => {
      restoreDomOrder(from.container, item, from.index);
      const current = latest.current;
      current.onChange(moveRow(current.rows, from.index, to.index));
    },
  });

  const types: SelectItem[] =
    allowFiles || allowSecret
      ? [
          { value: 'text', label: 'Text' },
          ...(allowSecret ? [{ value: 'secret', label: 'Secret' }] : []),
          ...(allowFiles ? [{ value: 'file', label: 'File' }] : []),
        ]
      : [];

  const update = (index: number, row: KeyValueRow) =>
    onChange(rows.map((r, i) => (i === index ? row : r)));

  const add = () => {
    const id = newId();
    pendingFocus.current = { id, target: 'key' };
    onChange([...rows, { id, enabled: true, key: '', value: '' }]);
  };

  const onRowKeyDown = (
    e: React.KeyboardEvent<HTMLTableRowElement>,
    index: number,
  ) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    // Never let Alt+Arrow do anything else inside a row (no history nav).
    e.preventDefault();
    if (e.target !== e.currentTarget) return;
    const to = index + (e.key === 'ArrowUp' ? -1 : 1);
    if (to < 0 || to >= rows.length) return;
    const row = rows[index];
    pendingFocus.current = { id: row.id, target: 'row' };
    setAnnouncement(
      `Moved ${rowName(row, index)} to position ${to + 1} of ${rows.length}`,
    );
    onChange(moveRow(rows, index, to));
  };

  const toggleBulk = () => {
    if (!bulk) setDraft(toBulkText(rows));
    setBulk(!bulk);
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {bulk ? (
        <CodeSurface
          value={draft}
          onChange={(text) => {
            setDraft(text);
            onChange(fromBulkText(text, rows));
          }}
          language="plain"
          label={`${ariaLabel}, one key: value per line`}
          placeholder="Key: value"
          minHeight={160}
        />
      ) : (
        <Table aria-label={ariaLabel}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8 px-1">
                <span className="sr-only">Order</span>
              </TableHead>
              <TableHead className="w-10 px-1">
                <span className="sr-only">Enabled</span>
              </TableHead>
              <TableHead>{keyLabel}</TableHead>
              <TableHead>{valueLabel}</TableHead>
              {types.length > 0 && <TableHead>Type</TableHead>}
              <TableHead className="w-10 px-1">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody ref={sortableRef}>
            {rows.map((row, i) => (
              <KeyValueRowView
                key={row.id}
                row={row}
                index={i}
                keyLabel={keyLabel}
                valueLabel={valueLabel}
                types={types}
                onChange={(next) => update(i, next)}
                onRemove={() => onChange(rows.filter((r) => r.id !== row.id))}
                onKeyDown={(e) => onRowKeyDown(e, i)}
                rowRef={(el) => {
                  if (el) rowNodes.current.set(row.id, el);
                  else rowNodes.current.delete(row.id);
                }}
                keyRef={(el) => {
                  if (el) keyNodes.current.set(row.id, el);
                  else keyNodes.current.delete(row.id);
                }}
              />
            ))}
          </TableBody>
        </Table>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {bulk ? (
          <span className="text-xs text-fg-muted">
            Start a line with a hash and a space to disable it.
          </span>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<IconPlus size="sm" />}
            onClick={add}
          >
            Add row
          </Button>
        )}
        {bulkEdit && (
          <Button
            size="sm"
            variant="ghost"
            aria-pressed={bulk}
            leftIcon={<IconList size="sm" />}
            onClick={toggleBulk}
          >
            Bulk edit
          </Button>
        )}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
KeyValueEditor.displayName = 'KeyValueEditor';
