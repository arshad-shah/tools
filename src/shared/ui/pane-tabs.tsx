import React, { useId, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Tabs, TabsList, TabsTrigger } from './tabs';
import { usePaneTab } from './use-pane-tab';

export interface Pane {
  id: string;
  label: string;
  content: React.ReactNode;
  /**
   * Any value that changes when the pane's content does (for example the
   * output text). A change while the pane is hidden puts a dot on its tab.
   */
  changeKey?: unknown;
}

export interface PaneTabsProps {
  /** Persistence key, usually the tool id (add a suffix for a second set). */
  id: string;
  /** Accessible name of the tab list. */
  label: string;
  panes: Pane[];
  /** Controlled pane (with usePaneTab); otherwise PaneTabs remembers it. */
  value?: string;
  onValueChange?(id: string): void;
  /** Rendered at the end of the tab row (actions for the shown pane). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * One pane at a time on every screen size (ruling R41): Input/Output,
 * Edit/Preview, Original/Changed. Every pane stays mounted (state, scroll
 * and undo survive a switch), a pane that changed while hidden shows a dot,
 * arrows move between tabs, and the last pane is remembered per `id`.
 */
export function PaneTabs({
  id,
  label,
  panes,
  value,
  onValueChange,
  actions,
  className,
}: PaneTabsProps) {
  const own = usePaneTab(id, panes[0]?.id ?? '');
  const raw = value ?? own.value;
  const active = panes.some((p) => p.id === raw) ? raw : (panes[0]?.id ?? '');
  const select = (pane: string) => {
    if (onValueChange) onValueChange(pane);
    else own.show(pane);
  };
  const base = useId();

  // Dots: a pane whose changeKey moved while it was hidden. The last seen
  // keys live in state and are compared during render (no effect lag).
  const [seen, setSeen] = useState<ReadonlyMap<string, unknown>>(
    () => new Map(panes.map((p) => [p.id, p.changeKey])),
  );
  const [dirty, setDirty] = useState<ReadonlySet<string>>(new Set());
  let nextSeen: Map<string, unknown> | null = null;
  let nextDirty: Set<string> | null = null;
  for (const p of panes) {
    if (Object.is(seen.get(p.id), p.changeKey) && seen.has(p.id)) continue;
    nextSeen ??= new Map(seen);
    nextSeen.set(p.id, p.changeKey);
    if (seen.has(p.id) && p.id !== active && !dirty.has(p.id)) {
      nextDirty ??= new Set(dirty);
      nextDirty.add(p.id);
    }
  }
  if (dirty.has(active)) {
    nextDirty ??= new Set(dirty);
    nextDirty.delete(active);
  }
  if (nextSeen) setSeen(nextSeen);
  if (nextDirty) setDirty(nextDirty);

  return (
    <Tabs
      value={active}
      onValueChange={select}
      className={cn('min-w-0 gap-3', className)}
    >
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-2">
        <TabsList aria-label={label} className="min-w-0">
          {panes.map((p) => (
            <TabsTrigger
              key={p.id}
              value={p.id}
              id={`${base}-tab-${p.id}`}
              aria-controls={`${base}-panel-${p.id}`}
              className="inline-flex items-center gap-1.5"
            >
              {p.label}
              {dirty.has(p.id) ? (
                <>
                  <span
                    aria-hidden
                    data-pane-dot=""
                    className="size-1.5 rounded-full bg-accent-indicator"
                  />
                  <span className="sr-only">, updated</span>
                </>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            {actions}
          </div>
        ) : null}
      </div>
      {panes.map((p) => (
        <div
          key={p.id}
          role="tabpanel"
          id={`${base}-panel-${p.id}`}
          aria-labelledby={`${base}-tab-${p.id}`}
          hidden={p.id !== active}
          className="min-w-0"
        >
          {p.content}
        </div>
      ))}
    </Tabs>
  );
}
PaneTabs.displayName = 'PaneTabs';
