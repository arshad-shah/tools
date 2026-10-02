import { useEffect, useMemo, useRef } from 'react';
import { useCommands, type CommandSource } from './commands';
import { parseHotkey, useShortcuts, type ShortcutDef } from './hotkeys';

export interface ToolCommand {
  id: string;
  label: string;
  /** Hotkey combo such as `Mod+Shift+C` or `n` (see hotkeys.ts). */
  shortcut?: string;
  /** Palette group; defaults to "Actions". */
  group?: string;
  run: () => void;
  /** false disables the command and its shortcut. */
  enabled?: boolean;
}

const hasModifier = (combo: string) => {
  const hk = parseHotkey(combo);
  return hk.mod || hk.ctrl || hk.alt;
};

/**
 * Registers a tool's commands with the Mod+K palette (source `tool:<id>`)
 * and binds their shortcuts (spec §4.6). Shortcuts with a modifier also
 * fire while typing (unless AltGraph is held: AltGr reads as Ctrl+Alt on
 * Windows); single keys never do. Commands are read through a ref, so
 * closures stay fresh without re-registering.
 */
export function useToolCommands(toolId: string, commands: ToolCommand[]): void {
  const latest = useRef(commands);
  useEffect(() => {
    latest.current = commands;
  });

  const find = (id: string) =>
    latest.current.find((c) => c.id === id && c.enabled !== false);

  const source = useMemo<CommandSource>(
    () => ({
      id: `tool:${toolId}`,
      commands: () =>
        latest.current.map((c) => ({
          id: `tool:${toolId}:${c.id}`,
          label: c.label,
          group: c.group ?? 'Actions',
          shortcut: c.shortcut,
          disabled: c.enabled === false,
          run: () => find(c.id)?.run(),
        })),
    }),
    [toolId],
  );
  useCommands(source, [source]);

  // Re-bind only when the shortcut set changes (a string key keeps the memo
  // stable across renders that pass new command objects).
  const bindingKey = JSON.stringify(
    commands
      .filter((c) => c.shortcut)
      .map((c) => [c.id, c.shortcut, c.label, c.group ?? 'Actions']),
  );
  const defs = useMemo<ShortcutDef[]>(
    () =>
      (JSON.parse(bindingKey) as [string, string, string, string][]).map(
        ([id, combo, label, group]) => ({
          id: `tool:${toolId}:${id}`,
          combo,
          description: label,
          group,
          allowInFields: hasModifier(combo),
          when: () => find(id) !== undefined,
          run: () => find(id)?.run(),
        }),
      ),
    [toolId, bindingKey],
  );
  useShortcuts(defs, [defs]);
}
