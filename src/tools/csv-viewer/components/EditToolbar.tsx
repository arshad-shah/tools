import { useId, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Inline,
  Input,
  Label,
  Select,
  Stack,
  Tooltip,
} from '@/shared/ui';
import {
  IconChevronDown,
  IconPlus,
  IconRedo,
  IconUndo,
} from '@/shared/ui/icons';
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
}: EditToolbarProps) {
  const [open, setOpen] = useState<DialogKind>(null);
  const [col, setCol] = useState('');
  const [name, setName] = useState('');
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [regex, setRegex] = useState(false);
  const ids = {
    col: useId(),
    name: useId(),
    find: useId(),
    repl: useId(),
    re: useId(),
  };
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
    <Stack gap="1">
      <Label htmlFor={ids.col}>Column</Label>
      <Select
        id={ids.col}
        value={column}
        onValueChange={setCol}
        items={columns.map((c) => ({ value: c, label: c }))}
      />
    </Stack>
  );

  const titles: Record<Exclude<DialogKind, null>, string> = {
    'add-column': 'Add column',
    rename: 'Rename column',
    'delete-column': 'Delete column',
    replace: 'Find and replace',
  };

  return (
    <Inline gap="2" align="center" wrap>
      <Tooltip content="Undo" shortcut="Mod+Z">
        <IconButton
          size="sm"
          variant="ghost"
          label="Undo"
          showLabel="desktop"
          aria-keyshortcuts="Control+Z"
          icon={IconUndo}
          disabled={!canUndo}
          onClick={onUndo}
        />
      </Tooltip>
      <Tooltip content="Redo" shortcut="Mod+Shift+Z">
        <IconButton
          size="sm"
          variant="ghost"
          label="Redo"
          showLabel="desktop"
          aria-keyshortcuts="Control+Shift+Z"
          icon={IconRedo}
          disabled={!canRedo}
          onClick={onRedo}
        />
      </Tooltip>
      <Button
        size="sm"
        variant="secondary"
        leftIcon={<IconPlus size="sm" />}
        onClick={() => onEdit({ kind: 'add-row', at: rowCount })}
      >
        Add row
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            size="sm"
            variant="secondary"
            rightIcon={<IconChevronDown size="sm" />}
          >
            Edit
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => start('add-column')}>
            Add column
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => start('rename')}>
            Rename column
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => start('delete-column')}>
            Delete column
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit({ kind: 'dedupe', by: [] })}>
            Remove duplicate rows
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit({ kind: 'trim' })}>
            Trim whitespace
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => start('replace')}>
            Find and replace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        {open && (
          <>
            <DialogHeader>
              <DialogTitle>{titles[open]}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="3">
                {open !== 'add-column' && columnSelect}
                {(open === 'add-column' || open === 'rename') && (
                  <Stack gap="1">
                    <Label htmlFor={ids.name}>New name</Label>
                    <Input id={ids.name} value={name} onChange={setName} />
                  </Stack>
                )}
                {open === 'replace' && (
                  <>
                    <Stack gap="1">
                      <Label htmlFor={ids.find}>Find</Label>
                      <Input id={ids.find} value={find} onChange={setFind} />
                    </Stack>
                    <Stack gap="1">
                      <Label htmlFor={ids.repl}>Replace with</Label>
                      <Input
                        id={ids.repl}
                        value={replace}
                        onChange={setReplace}
                      />
                    </Stack>
                    <Inline gap="2" align="center">
                      <Checkbox
                        id={ids.re}
                        checked={regex}
                        onCheckedChange={setRegex}
                      />
                      <Label htmlFor={ids.re}>Regular expression</Label>
                    </Inline>
                  </>
                )}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(null)}>
                Cancel
              </Button>
              <Button
                variant={open === 'delete-column' ? 'danger' : 'primary'}
                onClick={() => {
                  if (open === 'add-column')
                    submit({ kind: 'add-column', name, at: columns.length });
                  else if (open === 'rename')
                    submit({ kind: 'rename-column', col: column, name });
                  else if (open === 'delete-column')
                    submit({ kind: 'delete-column', col: column });
                  else
                    submit({
                      kind: 'replace',
                      col: column,
                      find,
                      replace,
                      regex,
                    });
                }}
              >
                {titles[open]}
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </Inline>
  );
}
