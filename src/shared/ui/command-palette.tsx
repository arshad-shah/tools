import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';
import { toToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import {
  noteCommandRun,
  queryCommands,
  useCommandRegistryVersion,
  type Command,
} from '@/shared/lib/commands';
import { IconSearch } from './icons';
import { ShortcutHint } from './shortcut-hint';

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  placeholder?: string;
}

const PAGE = 5;

/**
 * Mod+K palette (spec §4.6): a combobox over grouped, fuzzy-ranked commands
 * from every registered source. Arrows, Home/End and PageUp/PageDown move;
 * Enter closes then runs; Esc closes and focus returns where it was.
 */
export function CommandPalette({
  open,
  onOpenChange,
  placeholder = 'Search tools and actions',
}: CommandPaletteProps) {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <PaletteDialog onOpenChange={onOpenChange} placeholder={placeholder} />,
    document.body,
  );
}
CommandPalette.displayName = 'CommandPalette';

function PaletteDialog({
  onOpenChange,
  placeholder,
}: {
  onOpenChange(open: boolean): void;
  placeholder: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const restore = useRef<HTMLElement | null>(
    typeof document !== 'undefined'
      ? (document.activeElement as HTMLElement | null)
      : null,
  );
  // Set when a command runs: the command owns focus from then on.
  const ran = useRef(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const version = useCommandRegistryVersion();

  const groups = useMemo(
    () => queryCommands(query),
    // version: re-query when sources change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, version],
  );
  const flat = useMemo(() => groups.flatMap((g) => g.commands), [groups]);
  const index = flat.length ? Math.min(active, flat.length - 1) : -1;
  const optionId = (i: number) => `${id}-option-${i}`;

  useEffect(() => {
    input.current?.focus();
    const previous = restore.current;
    return () => {
      if (!ran.current) previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (index >= 0)
      document
        .getElementById(optionId(index))
        ?.scrollIntoView?.({ block: 'nearest' });
    // optionId is derived from the stable id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const close = () => onOpenChange(false);

  /**
   * Closes first; the command runs once the palette has unmounted, so the
   * focus it sets is kept, and a rejection is reported (never swallowed).
   */
  const run = (c: Command | undefined) => {
    if (!c || c.disabled) return;
    ran.current = true;
    close();
    noteCommandRun(c.id);
    setTimeout(() => {
      Promise.resolve()
        .then(() => c.run())
        .catch((e: unknown) => notify.error(toToolError(e)));
    }, 0);
  };

  const announcement =
    flat.length === 0
      ? `No commands match${query ? ` "${query}"` : ''}`
      : query.trim()
        ? `${flat.length} ${flat.length === 1 ? 'result' : 'results'}`
        : '';

  const move = (to: number) => {
    if (!flat.length) return;
    setActive(Math.max(0, Math.min(flat.length - 1, to)));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        move(index + 1);
        break;
      case 'ArrowUp':
        move(index - 1);
        break;
      case 'Home':
        move(0);
        break;
      case 'End':
        move(flat.length - 1);
        break;
      case 'PageDown':
        move(index + PAGE);
        break;
      case 'PageUp':
        move(index - PAGE);
        break;
      case 'Enter':
        run(flat[index]);
        break;
      case 'Escape':
        close();
        break;
      case 'Tab':
        // Focus stays in the field: the list is navigated with arrows.
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  let n = -1;
  return (
    <div className="fixed inset-0 z-palette flex items-start justify-center px-4 pt-[12vh]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-canvas/70"
        onPointerDown={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-surface shadow-e3"
      >
        <div className="flex items-center gap-2 border-b border-line px-4">
          <IconSearch size="md" className="text-fg-subtle" />
          <input
            ref={input}
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-listbox`}
            aria-activedescendant={index >= 0 ? optionId(index) : undefined}
            aria-autocomplete="list"
            aria-label="Search commands"
            autoComplete="off"
            spellCheck={false}
            value={query}
            placeholder={placeholder}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            className="h-12 min-w-0 flex-1 bg-transparent text-md text-fg placeholder:text-fg-subtle focus:outline-none"
          />
        </div>
        <div
          id={`${id}-listbox`}
          role="listbox"
          aria-label="Commands"
          className="min-h-0 flex-1 overflow-y-auto p-2"
        >
          {groups.map((g) => (
            <div
              key={g.group}
              role="group"
              aria-label={g.group}
              className="py-1"
            >
              <div
                aria-hidden="true"
                className="px-3 pt-2 pb-1 font-mono-meta text-xs text-fg-subtle"
              >
                {g.group}
              </div>
              {g.commands.map((c) => {
                n++;
                const i = n;
                const selected = i === index;
                const reason =
                  typeof c.disabled === 'string' ? c.disabled : null;
                const Icon = c.icon;
                return (
                  <div
                    key={c.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={c.disabled ? true : undefined}
                    aria-describedby={
                      reason ? `${optionId(i)}-reason` : undefined
                    }
                    onPointerMove={() => setActive(i)}
                    onClick={() => run(c)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm',
                      selected ? 'bg-surface-2 text-fg' : 'text-fg-muted',
                      c.disabled && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    {Icon ? (
                      <Icon size="sm" className="text-fg-subtle" />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{c.label}</span>
                    {reason ? (
                      <span
                        id={`${optionId(i)}-reason`}
                        className="font-mono-meta text-xs text-fg-subtle"
                      >
                        {reason}
                      </span>
                    ) : null}
                    {c.shortcut ? <ShortcutHint keys={c.shortcut} /> : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {flat.length === 0 ? (
          <p
            aria-hidden="true"
            className="px-3 pb-6 text-center text-sm text-fg-muted"
          >
            {announcement}
          </p>
        ) : null}
        {/* Mounted with the dialog so changes are announced. */}
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
    </div>
  );
}
