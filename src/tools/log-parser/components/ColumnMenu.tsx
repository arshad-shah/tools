import { useId, useRef, useState } from 'react';
import { Button, Checkbox, Inline, Label, Popover, Stack } from '@/shared/ui';
import { IconChevronDown, IconColumns } from '@/shared/ui/icons';
import { LOG_COLUMNS, type LogColumn } from '../settings';

const COLUMN_LABEL: Record<LogColumn, string> = {
  line: 'Line number',
  time: 'Time',
  level: 'Level',
  component: 'Component',
};

export interface ColumnMenuProps {
  columns: readonly LogColumn[];
  onColumns(columns: LogColumn[]): void;
}

/** Which summary columns the entry rows show (persisted in settings). */
export function ColumnMenu({ columns, onColumns }: ColumnMenuProps) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const base = useId();
  const toggle = (c: LogColumn, on: boolean) =>
    onColumns(LOG_COLUMNS.filter((x) => (x === c ? on : columns.includes(x))));
  return (
    <>
      <Button
        ref={anchor}
        size="sm"
        variant="ghost"
        leftIcon={<IconColumns size="sm" />}
        rightIcon={<IconChevronDown size="sm" />}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Columns
      </Button>
      <Popover
        open={open}
        onOpenChange={setOpen}
        anchor={anchor}
        label="Columns"
      >
        <Stack gap="2" className="p-1">
          {LOG_COLUMNS.map((c) => (
            <Inline key={c} gap="2" wrap={false}>
              <Checkbox
                id={`${base}-${c}`}
                size="sm"
                checked={columns.includes(c)}
                onCheckedChange={(on) => toggle(c, on)}
              />
              <Label htmlFor={`${base}-${c}`}>{COLUMN_LABEL[c]}</Label>
            </Inline>
          ))}
        </Stack>
      </Popover>
    </>
  );
}
