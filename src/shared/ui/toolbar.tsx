import React from 'react';
import { cn } from '@/shared/lib/cn';
import { IconChevronDown, type IconComponent } from '@/shared/ui/icons';
import { IconButton } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './menu';
import { rovingIndex } from './roving';
import { Tooltip } from './tooltip';
import { useScrollRow } from './use-scroll-row';

export interface ToolItem {
  id: string;
  /** Accessible name and tooltip. */
  label: string;
  /** Visible text when the toolbar shows labels (default `label`). */
  shortLabel?: string;
  icon: IconComponent;
  shortcut?: string;
  kind: 'button' | 'toggle' | 'split';
  pressed?: boolean;
  /** true, or the reason it is unavailable (shown in the tooltip). */
  disabled?: boolean | string;
  onSelect(): void;
  /** Split button menu. */
  menu?: { id: string; label: string; onSelect(): void }[];
  /** Receives the item's button, e.g. to anchor a Popover it opens. */
  anchor?: React.RefObject<HTMLButtonElement | null>;
}

export interface ToolGroup {
  id: string;
  label: string;
  items: ToolItem[];
}

export interface ToolbarProps {
  label: string;
  groups: ToolGroup[];
  orientation?: 'horizontal' | 'vertical';
  /** Rendered after the groups, outside the roving set. */
  trailing?: React.ReactNode;
  /**
   * md: compact 32px buttons (Standard layout, default). lg: 44px touch
   * targets for the Focus and phone layouts (spec §13.2).
   */
  size?: ToolbarSize;
  /**
   * Horizontal bars: each tool's label shows beside its icon on desktop
   * (fine pointer, 1024 px and up); icon only with a tooltip below that,
   * where the row scrolls (6-H).
   */
  labelled?: boolean;
}

export type ToolbarSize = 'md' | 'lg';

/** Sets an item's anchor ref (kept out of render: called from a ref callback). */
function setAnchor(item: ToolItem, el: HTMLButtonElement | null) {
  if (item.anchor) item.anchor.current = el;
}

/** Toolbar size to IconButton size. */
const BUTTON_SIZE = { md: 'sm', lg: 'lg' } as const;
/**
 * The split button's menu trigger: thin across the bar, and as long as its
 * main button along it (labelled or icon-only), so the pair stays one row.
 */
const SPLIT_TRIGGER = {
  md: {
    vertical: 'h-4 w-auto self-stretch',
    horizontal: 'h-auto w-4 self-stretch',
  },
  lg: { vertical: 'h-touch w-touch', horizontal: 'h-touch w-touch' },
} as const;

/**
 * Contextual tools for a mode (spec §4.6): one Tab stop with roving focus,
 * separators between groups, tooltips with label and shortcut. Disabled
 * items stay focusable so their reason can be read.
 */
export function Toolbar({
  label,
  groups,
  orientation = 'horizontal',
  trailing,
  size = 'md',
  labelled = false,
}: ToolbarProps) {
  const flat = groups.flatMap((g) => g.items);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const active = flat.some((it) => it.id === activeId)
    ? activeId
    : (flat[0]?.id ?? null);
  const nodes = React.useRef(new Map<string, HTMLButtonElement>());
  const menus = React.useRef(new Map<string, HTMLButtonElement>());
  const vertical = orientation === 'vertical';
  const scroller = useScrollRow<HTMLDivElement>(vertical ? 'y' : 'x');

  const focusItem = (id: string) => {
    setActiveId(id);
    nodes.current.get(id)?.focus();
  };

  const openMenu = (id: string) => {
    const trigger = menus.current.get(id);
    if (!trigger) return;
    // A programmatic click counts as keyboard: the menu focuses its first item.
    trigger.click();
  };

  const onKeyDown = (e: React.KeyboardEvent, item: ToolItem) => {
    if (
      item.kind === 'split' &&
      !e.altKey &&
      e.key === (vertical ? 'ArrowRight' : 'ArrowDown')
    ) {
      e.preventDefault();
      openMenu(item.id);
      return;
    }
    const index = flat.findIndex((it) => it.id === item.id);
    const to = rovingIndex(e, index, flat.length, orientation);
    if (to === null) return;
    e.preventDefault();
    focusItem(flat[to].id);
  };

  const renderItem = (item: ToolItem) => {
    const reason = typeof item.disabled === 'string' ? item.disabled : null;
    const disabled = Boolean(item.disabled);
    const button = (
      <IconButton
        ref={(el: HTMLButtonElement | null) => {
          if (el) nodes.current.set(item.id, el);
          else nodes.current.delete(item.id);
          setAnchor(item, el);
        }}
        label={item.label}
        icon={item.icon}
        variant="ghost"
        size={BUTTON_SIZE[size]}
        showLabel={labelled && !vertical ? 'desktop' : undefined}
        text={item.shortLabel}
        tabIndex={item.id === active ? 0 : -1}
        // Toggles, and split items that show a pressed state (review P5-C).
        aria-pressed={
          item.kind === 'toggle' ||
          (item.kind === 'split' && item.pressed !== undefined)
            ? Boolean(item.pressed)
            : undefined
        }
        aria-disabled={disabled || undefined}
        aria-keyshortcuts={item.shortcut}
        onFocus={() => setActiveId(item.id)}
        onKeyDown={(e) => onKeyDown(e, item)}
        onClick={() => {
          if (!disabled) item.onSelect();
        }}
        className={cn(
          'shrink-0',
          item.pressed && 'bg-accent-soft text-accent-fg hover:text-accent-fg',
          disabled && 'cursor-not-allowed opacity-50',
          item.kind === 'split' &&
            (vertical ? 'rounded-b-none' : 'rounded-r-none'),
        )}
      />
    );
    const tip = (
      <Tooltip
        key={item.id}
        content={reason ?? item.label}
        shortcut={reason ? undefined : item.shortcut}
        side={vertical ? 'bottom' : 'top'}
      >
        {button}
      </Tooltip>
    );
    if (item.kind !== 'split') return tip;
    return (
      <DropdownMenu
        key={item.id}
        className={cn('shrink-0', vertical && 'flex-col')}
      >
        {tip}
        <DropdownMenuTrigger>
          <IconButton
            ref={(el: HTMLButtonElement | null) => {
              if (el) menus.current.set(item.id, el);
              else menus.current.delete(item.id);
            }}
            label={`${item.label} options`}
            icon={<IconChevronDown size="xs" />}
            variant="ghost"
            size={BUTTON_SIZE[size]}
            tabIndex={-1}
            disabled={disabled}
            className={cn(
              vertical
                ? `${SPLIT_TRIGGER[size].vertical} rounded-t-none`
                : `${SPLIT_TRIGGER[size].horizontal} rounded-l-none`,
            )}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" aria-label={item.label}>
          {(item.menu ?? []).map((m) => (
            <DropdownMenuItem key={m.id} onClick={m.onSelect}>
              {m.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div
      ref={scroller}
      role="toolbar"
      aria-label={label}
      aria-orientation={orientation}
      className={cn(
        // One row (or column) that scrolls instead of wrapping: edge fades
        // show there is more, the focused or active tool scrolls into view.
        'flex min-h-0 min-w-0 max-w-full items-center gap-1 p-0.5 scrollbar-none',
        vertical
          ? 'max-h-full scroll-py-0.5 flex-col overflow-y-auto overscroll-y-contain scroll-fade-y snap-y snap-proximity'
          : 'scroll-px-0.5 flex-row flex-nowrap overflow-x-auto overscroll-x-contain scroll-fade-x snap-x snap-proximity',
      )}
    >
      {groups.map((g, gi) => (
        <React.Fragment key={g.id}>
          {gi > 0 ? (
            <div
              role="separator"
              aria-orientation={vertical ? 'horizontal' : 'vertical'}
              className={cn(
                'shrink-0 bg-line',
                vertical ? 'my-1 h-px w-6' : 'mx-1 h-5 w-px',
              )}
            />
          ) : null}
          <div
            role="group"
            aria-label={g.label}
            className={cn(
              'flex shrink-0 snap-start items-center gap-0.5',
              vertical && 'flex-col',
            )}
          >
            {g.items.map(renderItem)}
          </div>
        </React.Fragment>
      ))}
      {trailing ? (
        <div
          className={cn(
            'flex shrink-0 items-center gap-1',
            vertical ? 'mt-1 flex-col' : 'ml-auto pl-1',
          )}
        >
          {trailing}
        </div>
      ) : null}
    </div>
  );
}
Toolbar.displayName = 'Toolbar';
