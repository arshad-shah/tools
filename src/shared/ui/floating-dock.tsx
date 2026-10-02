import React from 'react';
import { cn } from '@/shared/lib/cn';
import type { ModeTabItem } from './mode-tabs';
import { rovingIndex } from './roving';

export interface FloatingDockProps {
  label: string;
  items: ModeTabItem[];
  value: string;
  onChange(id: string): void;
  /** lg: 56px targets for phones. Default md. */
  size?: 'md' | 'lg';
}

/**
 * The Focus-layout and phone mode switcher: the same data as ModeTabs in a
 * bottom-centre pill. Same tab semantics and automatic activation.
 */
export function FloatingDock({
  label,
  items,
  value,
  onChange,
  size = 'md',
}: FloatingDockProps) {
  const tabs = React.useRef(new Map<string, HTMLButtonElement>());
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const to = rovingIndex(e, index, items.length);
    if (to === null) return;
    e.preventDefault();
    const id = items[to].id;
    onChange(id);
    tabs.current.get(id)?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className="fixed bottom-4 left-1/2 z-dock flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-xl bg-surface p-1.5 shadow-e3"
    >
      {items.map((it, i) => {
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
            aria-label={it.label}
            aria-selected={selected}
            aria-controls="mode-panel"
            aria-keyshortcuts={it.shortcut}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(it.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg outline-none transition-colors duration-fast',
              'focus-visible:ring-2 focus-visible:ring-focus',
              size === 'lg' ? 'size-14' : 'size-11',
              selected
                ? 'bg-accent-soft text-accent-fg'
                : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
            )}
          >
            <Icon size={size === 'lg' ? 'lg' : 'md'} />
            <span
              aria-hidden
              className={cn(
                'max-w-full truncate px-0.5 text-[10px] leading-3',
                size === 'md' && 'sr-only',
              )}
            >
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
FloatingDock.displayName = 'FloatingDock';
