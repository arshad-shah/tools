import React from 'react';
import { cn } from '@/shared/lib/cn';
import { IconChevronDown, type IconComponent } from '@/shared/ui/icons';
import { Badge } from './badge';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './menu';
import { rovingIndex } from './roving';
import { ShortcutHint } from './shortcut-hint';
import { useScrollRow } from './use-scroll-row';

export interface ModeTabItem {
  id: string;
  label: string;
  icon: IconComponent;
  shortcut?: string;
  badge?: string;
}

export interface ModeTabsProps {
  label: string;
  items: ModeTabItem[];
  value: string;
  onChange(id: string): void;
  /** Default: as many as fit the measured width. */
  maxVisible?: number;
}

/** Width budget per tab and for the More button, in CSS px. */
const TAB_PX = 104;
const MORE_PX = 88;

/** How many tabs fit `width`, leaving room for More when some overflow. */
function fitCount(width: number, count: number) {
  if (width <= 0 || count * TAB_PX <= width) return count;
  return Math.max(1, Math.floor((width - MORE_PX) / TAB_PX));
}

/** Visible items: the first `n`, with the active one swapped into the last slot. */
function splitItems(items: ModeTabItem[], n: number, value: string) {
  if (n >= items.length) return { shown: items, hidden: [] };
  const shown = items.slice(0, n);
  const active = items.findIndex((it) => it.id === value);
  if (active >= n) shown[n - 1] = items[active];
  const ids = new Set(shown.map((it) => it.id));
  return { shown, hidden: items.filter((it) => !ids.has(it.id)) };
}

/**
 * Mode switcher for the Standard layout. Automatic activation: arrows,
 * Home and End move focus and select. Modes past the width go into a More
 * menu that keeps their shortcuts.
 */
export function ModeTabs({
  label,
  items,
  value,
  onChange,
  maxVisible,
}: ModeTabsProps) {
  const root = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const el = root.current;
    if (
      !el ||
      maxVisible !== undefined ||
      typeof ResizeObserver === 'undefined'
    )
      return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w !== undefined) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxVisible]);

  const n = Math.max(1, maxVisible ?? fitCount(width, items.length));
  const { shown, hidden } = splitItems(items, n, value);
  const tabs = React.useRef(new Map<string, HTMLButtonElement>());
  const scroller = useScrollRow<HTMLDivElement>('x');

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const to = rovingIndex(e, index, shown.length);
    if (to === null) return;
    e.preventDefault();
    const id = shown[to].id;
    onChange(id);
    tabs.current.get(id)?.focus();
  };

  return (
    <div ref={root} className="flex min-w-0 flex-1 items-end gap-1">
      <div
        ref={scroller}
        role="tablist"
        aria-label={label}
        className="flex min-w-0 flex-nowrap items-end overflow-x-auto overscroll-x-contain scrollbar-none scroll-fade-x"
      >
        {shown.map((it, i) => {
          const selected = it.id === value;
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              ref={(el) => {
                if (el) tabs.current.set(it.id, el);
                else tabs.current.delete(it.id);
              }}
              type="button"
              role="tab"
              id={`mode-tab-${it.id}`}
              aria-selected={selected}
              aria-controls="mode-panel"
              aria-keyshortcuts={it.shortcut}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(it.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'relative inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap px-3 pointer-coarse:h-11 text-sm font-medium outline-none transition-colors duration-fast',
                'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus',
                selected ? 'text-fg' : 'text-fg-muted hover:text-fg',
              )}
            >
              <Icon size="sm" />
              {it.label}
              {it.badge ? (
                <Badge variant="soft" tone="accent">
                  {it.badge}
                </Badge>
              ) : null}
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent-indicator',
                  'motion-safe:transition-transform motion-safe:duration-base motion-safe:ease-out-soft',
                  selected ? 'scale-x-100' : 'scale-x-0',
                )}
              />
            </button>
          );
        })}
      </div>
      {hidden.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="sm"
              className="mb-1"
              rightIcon={<IconChevronDown size="sm" />}
            >
              More
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hidden.map((it) => {
              const Icon = it.icon;
              return (
                <DropdownMenuItem
                  key={it.id}
                  aria-keyshortcuts={it.shortcut}
                  onClick={() => onChange(it.id)}
                >
                  <Icon size="sm" />
                  <span className="flex-1">{it.label}</span>
                  {it.shortcut ? <ShortcutHint keys={it.shortcut} /> : null}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
ModeTabs.displayName = 'ModeTabs';
