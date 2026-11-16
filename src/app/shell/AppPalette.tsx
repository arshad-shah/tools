import { CommandPalette, type Command } from '@arshad-shah/cynosure';
import type { IconData } from '@arshad-shah/cynosure/icons';
import {
  arrowLeft,
  clipboardPaste,
  command,
  home,
  keyboard,
  monitor,
  moon,
  shieldCheck,
  sun,
} from '@arshad-shah/cynosure/icons';
import { useMemo, useState } from 'react';
import {
  queryCommands,
  RECENT_KEY,
  useCommandRegistryVersion,
} from '@/shared/lib/commands';
import { toToolError } from '@/shared/lib/errors';
import { commandScore } from '@/shared/lib/fuzzy';
import { hotkeyCaps } from '@/shared/lib/hotkeys';
import { notify } from '@/shared/lib/notify';
import { getCategory } from '../categories';
import { getTool } from '../registry';

const FIXED: Record<string, IconData> = {
  'route:home': home,
  'app:back': arrowLeft,
  'theme:light': sun,
  'theme:dark': moon,
  'theme:system': monitor,
  'app:import-curl': clipboardPaste,
  'help:shortcuts': keyboard,
  'help:privacy': shieldCheck,
};

/** The Facet icon for a registered command, by its id. */
function glyphFor(id: string): IconData {
  if (FIXED[id]) return FIXED[id];
  const [kind, rest] = id.split(':', 2);
  if (kind === 'tool' || kind === 'favourite')
    return getTool(rest)?.icon ?? command;
  if (kind === 'route') return getCategory(rest)?.icon ?? command;
  // Every row has an icon, so the labels line up.
  return command;
}

/** tools' fuzzy ranking (higher is better); Cynosure ranks lower first. */
const filter = (command: Command, query: string) => {
  const score = commandScore(query, command);
  return score === null ? null : { score: -score };
};

/**
 * Mod+K (redesign spec, Shell): Cynosure's CommandPalette over the app's
 * command registry, so every registered source (app commands, tools,
 * the workspace) is listed. The palette keeps recently run commands
 * (recentKey) and hands sources the query.
 */
export function AppPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const version = useCommandRegistryVersion();
  // Sources may build commands from the query ("Go to page 12").
  const [query, setQuery] = useState('');
  const groups = useMemo(
    () => (open ? queryCommands(query) : []),
    // version: re-read when sources change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, version, query],
  );
  const { commands, byId } = useMemo(() => {
    const list = groups.flatMap((g) => g.commands.map((c) => ({ c, g })));
    return {
      byId: new Map(list.map(({ c }) => [c.id, c])),
      commands: list.map(
        ({ c, g }): Command => ({
          id: c.id,
          label: c.label,
          group: g.group,
          ...(c.keywords ? { keywords: c.keywords } : {}),
          ...(c.shortcut ? { shortcut: hotkeyCaps(c.shortcut) } : {}),
          icon: glyphFor(c.id),
          disabled: !!c.disabled,
          ...(typeof c.disabled === 'string'
            ? { disabledReason: c.disabled }
            : {}),
        }),
      ),
    };
  }, [groups]);

  const run = (id: string) => {
    const c = byId.get(id);
    if (!c || c.disabled) return;
    // After the palette has closed, so the focus the command sets is kept.
    setTimeout(() => {
      Promise.resolve()
        .then(() => c.run())
        .catch((e: unknown) => notify.error(toToolError(e)));
    }, 0);
  };

  return (
    <CommandPalette
      open={open}
      onOpenChange={onOpenChange}
      commands={commands}
      onRun={run}
      onQueryChange={setQuery}
      filter={filter}
      recentKey={RECENT_KEY}
      labels={{
        title: 'Search tools and actions',
        placeholder: 'Search tools and actions',
        empty: 'No tools or actions match',
      }}
    />
  );
}
