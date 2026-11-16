import type { IconData } from '@arshad-shah/cynosure/icons';
import { useEffect, useSyncExternalStore } from 'react';
import { commandScore } from './fuzzy';

/** One palette entry. Labels are plain words, never glyphs. */
export interface Command {
  id: string;
  label: string;
  /** 'Tools' | 'Pages' | 'Modes' | 'Actions' | 'Recent documents' | ... */
  group: string;
  keywords?: string[];
  /** Hotkey combo shown with ShortcutHint. */
  shortcut?: string;
  /** A Facet icon. */
  icon?: IconData;
  /** true, or the reason shown to the user (CommandPalette `disabledReason`). */
  disabled?: boolean | string;
  run(): void | Promise<void>;
}

/** A source answers each query, so it can offer commands like "Go to page 12". */
export interface CommandSource {
  id: string;
  commands(query: string): Command[];
}

/** Where the palette keeps recently run command ids (CommandPalette `recentKey`). */
export const RECENT_KEY = 'tools:recent-commands';

const sources = new Set<CommandSource>();
const listeners = new Set<() => void>();
let version = 0;

const emit = () => {
  version++;
  for (const l of listeners) l();
};

export function registerCommandSource(source: CommandSource): () => void {
  sources.add(source);
  emit();
  return () => {
    sources.delete(source);
    emit();
  };
}

/** Registers a source while the component is mounted. */
export function useCommands(source: CommandSource, deps: unknown[]): void {
  // The caller owns the dependency list (like useMemo).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => registerCommandSource(source), deps);
}

/** Re-renders when sources change. */
export function useCommandRegistryVersion(): number {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
    () => version,
  );
}

export interface CommandGroup {
  group: string;
  commands: Command[];
}

/**
 * Commands from every source, grouped. Empty query: each group in source
 * order. Otherwise ranked by fuzzy score; groups are ordered by their best
 * match. (Recently run commands are the palette's own: CommandPalette
 * `recentKey`.)
 */
export function queryCommands(query: string): CommandGroup[] {
  const all: Command[] = [];
  const seen = new Set<string>();
  for (const s of sources)
    for (const c of s.commands(query))
      if (!seen.has(c.id)) {
        seen.add(c.id);
        all.push(c);
      }

  const groups = new Map<
    string,
    { best: number; order: number; items: { c: Command; s: number }[] }
  >();
  const add = (group: string, c: Command, s: number) => {
    let g = groups.get(group);
    if (!g) {
      g = { best: s, order: groups.size, items: [] };
      groups.set(group, g);
    }
    g.best = Math.max(g.best, s);
    g.items.push({ c, s });
  };

  if (!query.trim()) {
    for (const c of all) add(c.group, c, 0);
    return [...groups.entries()].map(([group, g]) => ({
      group,
      commands: g.items.map((x) => x.c),
    }));
  }

  for (const c of all) {
    const s = commandScore(query, c);
    if (s !== null) add(c.group, c, s);
  }
  return [...groups.entries()]
    .sort(([, a], [, b]) => b.best - a.best || a.order - b.order)
    .map(([group, g]) => ({
      group,
      commands: [...g.items].sort((a, b) => b.s - a.s).map((x) => x.c),
    }));
}

/** Test seam: forget sources. */
export function resetCommandsForTests(): void {
  sources.clear();
  emit();
}
