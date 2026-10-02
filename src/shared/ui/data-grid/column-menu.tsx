import type React from 'react';
import { useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button, IconButton } from '../button';
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconEye,
  IconEyeOff,
  IconFilter,
  IconMinus,
  IconMoreHorizontal,
  IconPlus,
  IconX,
} from '../icons';
import { Popover } from '../popover';

export interface ColumnMenuProps {
  header: string;
  sortDir?: 'asc' | 'desc';
  onSortDir(dir: 'asc' | 'desc' | null): void;
  onWider(): void;
  onNarrower(): void;
  onMove(delta: -1 | 1): void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onHide(): void;
  canHide: boolean;
  hidden: readonly { id: string; header: string }[];
  onShow(id: string): void;
  /** Opens the column's filter editor (anchored to this menu's button). */
  onFilter(): void;
  filterActive: boolean;
  /** Receives the menu button, the filter editor's anchor. */
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

const itemClass = 'w-full justify-start';

/**
 * Per-column options in a non-modal popover: sort, keyboard resize (Wider and
 * Narrower keep the menu open for repeated presses), move, hide and show.
 */
export function ColumnMenu(p: ColumnMenuProps) {
  const [open, setOpen] = useState(false);
  const own = useRef<HTMLButtonElement>(null);
  const anchor = p.buttonRef ?? own;
  const run = (fn: () => void) => () => {
    fn();
    setOpen(false);
    anchor.current?.focus();
  };
  return (
    <>
      <IconButton
        ref={anchor}
        label={
          p.filterActive
            ? `Column options ${p.header}, filtered`
            : `Column options ${p.header}`
        }
        icon={p.filterActive ? IconFilter : IconMoreHorizontal}
        variant="ghost"
        size="sm"
        tone={p.filterActive ? 'accent' : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn('size-7 shrink-0', p.filterActive && 'bg-accent-soft')}
      />
      <Popover
        open={open}
        onOpenChange={setOpen}
        anchor={anchor}
        label={`${p.header} column options`}
        align="end"
        className="flex w-56 flex-col gap-0.5 p-1"
      >
        <Button
          variant="ghost"
          size="sm"
          className={itemClass}
          leftIcon={<IconFilter size="sm" />}
          aria-haspopup="dialog"
          onClick={() => {
            setOpen(false);
            p.onFilter();
          }}
        >
          {p.filterActive ? 'Edit filter' : 'Filter'}
        </Button>
        <div className="my-1 h-px bg-line" role="separator" />
        <Button
          variant="ghost"
          size="sm"
          className={itemClass}
          leftIcon={<IconArrowUp size="sm" />}
          aria-pressed={p.sortDir === 'asc'}
          onClick={run(() => p.onSortDir('asc'))}
        >
          Sort ascending
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={itemClass}
          leftIcon={<IconArrowDown size="sm" />}
          aria-pressed={p.sortDir === 'desc'}
          onClick={run(() => p.onSortDir('desc'))}
        >
          Sort descending
        </Button>
        {p.sortDir && (
          <Button
            variant="ghost"
            size="sm"
            className={itemClass}
            leftIcon={<IconX size="sm" />}
            onClick={run(() => p.onSortDir(null))}
          >
            Clear sort
          </Button>
        )}
        <div className="my-1 h-px bg-line" role="separator" />
        <Button
          variant="ghost"
          size="sm"
          className={itemClass}
          leftIcon={<IconPlus size="sm" />}
          onClick={p.onWider}
        >
          Wider
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={itemClass}
          leftIcon={<IconMinus size="sm" />}
          onClick={p.onNarrower}
        >
          Narrower
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={itemClass}
          leftIcon={<IconArrowLeft size="sm" />}
          disabled={!p.canMoveLeft}
          onClick={() => p.onMove(-1)}
        >
          Move left
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={itemClass}
          leftIcon={<IconArrowRight size="sm" />}
          disabled={!p.canMoveRight}
          onClick={() => p.onMove(1)}
        >
          Move right
        </Button>
        <div className="my-1 h-px bg-line" role="separator" />
        <Button
          variant="ghost"
          size="sm"
          className={itemClass}
          leftIcon={<IconEyeOff size="sm" />}
          disabled={!p.canHide}
          onClick={run(p.onHide)}
        >
          Hide column
        </Button>
        {p.hidden.map((h) => (
          <Button
            key={h.id}
            variant="ghost"
            size="sm"
            className={itemClass}
            leftIcon={<IconEye size="sm" />}
            onClick={run(() => p.onShow(h.id))}
          >
            {`Show ${h.header}`}
          </Button>
        ))}
      </Popover>
    </>
  );
}
