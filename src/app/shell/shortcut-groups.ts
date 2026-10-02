import { hotkeyLabel, type ShortcutDef } from '@/shared/lib/hotkeys';

export interface ShortcutRow {
  description: string;
  combos: string[];
}

export interface ShortcutGroup {
  group: string;
  rows: ShortcutRow[];
}

/** Shell groups lead; the workspace and the active mode follow. */
const LEADING = ['General', 'Workspace'];

/**
 * Registered shortcuts grouped for the sheet: one row per action (combos of
 * the same action merged, as Redo's Mod+Shift+Z and Mod+Y), filtered by
 * description or key words.
 */
export function groupShortcuts(
  defs: ShortcutDef[],
  filter: string,
): ShortcutGroup[] {
  const q = filter.trim().toLowerCase();
  const groups = new Map<string, Map<string, ShortcutRow>>();
  for (const d of defs) {
    if (d.when && !d.when()) continue;
    if (
      q &&
      !d.description.toLowerCase().includes(q) &&
      !hotkeyLabel(d.combo).toLowerCase().includes(q)
    )
      continue;
    let rows = groups.get(d.group);
    if (!rows) groups.set(d.group, (rows = new Map()));
    const row = rows.get(d.description);
    if (!row)
      rows.set(d.description, {
        description: d.description,
        combos: [d.combo],
      });
    else if (!row.combos.includes(d.combo)) row.combos.push(d.combo);
  }
  const rank = (g: string) => {
    const i = LEADING.indexOf(g);
    return i < 0 ? LEADING.length : i;
  };
  return [...groups.entries()]
    .map(([group, rows], order) => ({ group, rows: [...rows.values()], order }))
    .sort((a, b) => rank(a.group) - rank(b.group) || a.order - b.order)
    .map(({ group, rows }) => ({ group, rows }));
}
