import React from 'react';
import { cn } from '@/shared/lib/cn';
import type { IconComponent } from './icons';
import { Kbd } from './kbd';
import { Popover } from './popover';

export type ContextMenuEntry =
  | {
      id: string;
      label: string;
      icon?: IconComponent;
      /** A hotkey combo shown as key chips, e.g. `Mod+D`. */
      shortcut?: string;
      destructive?: boolean;
      disabled?: boolean;
      separator?: undefined;
      onSelect(): void;
    }
  | { id: string; separator: true };

export interface ContextMenuProps {
  open: boolean;
  /** Viewport px (clientX, clientY) the menu opens at. */
  at: { x: number; y: number };
  /** Accessible name of the menu. */
  label: string;
  items: readonly ContextMenuEntry[];
  onClose(): void;
}

/**
 * A menu at a point (right-click, long-press, the Menu key): arrows, Home
 * and End move between enabled items, Enter or a click runs one and closes,
 * Esc or a pointer-down outside closes. Focus returns to where it was.
 */
export function ContextMenu({
  open,
  at,
  label,
  items,
  onClose,
}: ContextMenuProps) {
  const menu = React.useRef<HTMLDivElement>(null);
  const back = React.useRef<HTMLElement | null>(null);
  const anchor = React.useMemo(
    () => ({ getBoundingClientRect: () => new DOMRect(at.x, at.y, 0, 0) }),
    [at.x, at.y],
  );

  React.useEffect(() => {
    if (!open) return;
    back.current = document.activeElement as HTMLElement | null;
    return () => {
      const el = back.current;
      if (el?.isConnected) el.focus({ preventScroll: true });
    };
  }, [open]);

  const enabled = () => [
    ...(menu.current?.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not([disabled])',
    ) ?? []),
  ];

  const onKeyDown = (e: React.KeyboardEvent) => {
    const list = enabled();
    if (!list.length) return;
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (e.key === 'ArrowDown') next = (i + 1) % list.length;
    else if (e.key === 'ArrowUp') next = (i - 1 + list.length) % list.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = list.length - 1;
    else if (e.key === 'Tab') {
      e.preventDefault();
      onClose();
      return;
    }
    if (next < 0) return;
    e.preventDefault();
    list[next].focus();
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => !o && onClose()}
      anchor={anchor}
      side="bottom"
      align="start"
      offset={2}
      label={label}
      className="p-1"
    >
      <div
        ref={menu}
        role="menu"
        aria-label={label}
        className="flex min-w-52 flex-col"
        onKeyDown={onKeyDown}
        onContextMenu={(e) => e.preventDefault()}
      >
        {items.map((item) =>
          item.separator ? (
            <div key={item.id} role="separator" className="my-1 h-px bg-line" />
          ) : (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                onClose();
                item.onSelect();
              }}
              className={cn(
                'flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none transition-colors duration-fast',
                'hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:ring-2 focus-visible:ring-focus',
                'disabled:cursor-not-allowed disabled:opacity-50',
                item.destructive ? 'text-danger' : 'text-fg',
              )}
            >
              {item.icon ? <item.icon size="sm" /> : <span className="w-4" />}
              <span className="flex-1">{item.label}</span>
              {item.shortcut ? <Kbd keys={item.shortcut} /> : null}
            </button>
          ),
        )}
      </div>
    </Popover>
  );
}
ContextMenu.displayName = 'ContextMenu';
