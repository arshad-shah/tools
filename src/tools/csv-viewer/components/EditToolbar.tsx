import {
  Button,
  Checkbox,
  Dialog,
  IconButton,
  Inline,
  Menu,
  Select,
  Stack,
  TextField,
} from '@arshad-shah/cynosure';
import {
  chevronDown,
  plus,
  redo,
  trash,
  undo,
} from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import type { EditOp } from '../lib/edit';

type DialogKind = 'add-column' | 'rename' | 'delete-column' | 'replace' | null;

interface EditToolbarProps {
  columns: readonly string[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo(): void;
  onRedo(): void;
  /** Applies an edit; false keeps the dialog open (the error shows). */
  onEdit(op: EditOp): boolean;
  rowCount: number;
  /** Indices into the table's rows under the grid selection. */
  selectedRows: readonly number[];
}

/** Undo, redo, row and column operations, dedupe, trim, find and replace. */
export function EditToolbar({
  columns,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onEdit,
  rowCount,
  selectedRows,
}: EditToolbarProps) {
  const [open, setOpen] = useState<DialogKind>(null);
  const [col, setCol] = useState('');
  const [name, setName] = useState('');
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [regex, setRegex] = useState(false);
  const column = columns.includes(col) ? col : (columns[0] ?? '');

  const start = (kind: DialogKind) => {
    setName('');
    setFind('');
    setReplace('');
    setOpen(kind);
  };
  const submit = (op: EditOp) => {
    if (onEdit(op)) setOpen(null);
  };

  const columnSelect = (
    <Select
      label="Column"
      value={column}
      onChange={setCol}
      options={columns.map((c) => ({ value: c, label: c }))}
    />
  );

  const titles: Record<Exclude<DialogKind, null>, string> = {
    'add-column': 'Add column',
    rename: 'Rename column',
    'delete-column': 'Delete column',
    replace: 'Find and replace',
  };

  const run = () => {
    if (open === 'add-column')
      submit({ kind: 'add-column', name, at: columns.length });
    else if (open === 'rename')
      submit({ kind: 'rename-column', col: column, name });
    else if (open === 'delete-column')
      submit({ kind: 'delete-column', col: column });
    else submit({ kind: 'replace', col: column, find, replace, regex });
  };

  return (
    <Inline gap="2" align="center" wrap>
      <IconButton
        size="sm"
        variant="ghost"
        label="Undo"
        aria-keyshortcuts="Control+Z"
        icon={undo}
        disabled={!canUndo}
        onClick={onUndo}
      />
      <IconButton
        size="sm"
        variant="ghost"
        label="Redo"
        aria-keyshortcuts="Control+Shift+Z"
        icon={redo}
        disabled={!canRedo}
        onClick={onRedo}
      />
      <Button
        size="sm"
        variant="soft"
        icon={plus}
        onClick={() => onEdit({ kind: 'add-row', at: rowCount })}
      >
        Add row
      </Button>
      <Button
        size="sm"
        variant="soft"
        icon={trash}
        disabled={selectedRows.length === 0}
        onClick={() => onEdit({ kind: 'delete-rows', rows: [...selectedRows] })}
      >
        {selectedRows.length > 1
          ? `Delete ${selectedRows.length.toLocaleString('en-US')} rows`
          : 'Delete row'}
      </Button>
      <Menu
        label="Edit"
        items={[
          {
            items: [
              { value: 'add-column', label: 'Add column' },
              { value: 'rename', label: 'Rename column' },
              {
                value: 'delete-column',
                label: 'Delete column',
                tone: 'danger',
              },
            ],
          },
          {
            items: [
              { value: 'dedupe', label: 'Remove duplicate rows' },
              { value: 'trim', label: 'Trim whitespace' },
              { value: 'replace', label: 'Find and replace' },
            ],
          },
        ]}
        onSelect={(v) => {
          if (v === 'dedupe') onEdit({ kind: 'dedupe', by: [] });
          else if (v === 'trim') onEdit({ kind: 'trim' });
          else start(v as DialogKind);
        }}
        trigger={(props) => (
          <Button {...props} size="sm" variant="soft" iconEnd={chevronDown}>
            Edit
          </Button>
        )}
      />

      {open ? (
        <Dialog
          open
          onOpenChange={(o) => !o && setOpen(null)}
          title={titles[open]}
          actions={
            <>
              <Button variant="ghost" onClick={() => setOpen(null)}>
                Cancel
              </Button>
              <Button
                variant="solid"
                tone={open === 'delete-column' ? 'danger' : undefined}
                onClick={run}
              >
                {titles[open]}
              </Button>
            </>
          }
        >
          <Stack gap="3">
            {open !== 'add-column' && columnSelect}
            {(open === 'add-column' || open === 'rename') && (
              <TextField label="New name" value={name} onChange={setName} />
            )}
            {open === 'replace' && (
              <>
                <TextField label="Find" value={find} onChange={setFind} />
                <TextField
                  label="Replace with"
                  value={replace}
                  onChange={setReplace}
                />
                <Checkbox
                  label="Regular expression"
                  checked={regex}
                  onChange={setRegex}
                />
              </>
            )}
          </Stack>
        </Dialog>
      ) : null}
    </Inline>
  );
}
