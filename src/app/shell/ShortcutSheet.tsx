import {
  Dialog,
  EmptyState,
  Heading,
  Inline,
  Kbd,
  ListRow,
  ListRows,
  SearchField,
  Stack,
} from '@arshad-shah/cynosure';
import { useMemo, useState } from 'react';
import { hotkeyCaps, hotkeyLabel, listShortcuts } from '@/shared/lib/hotkeys';
import { groupShortcuts, type ShortcutGroup } from './shortcut-groups';

function Group({ group, rows }: ShortcutGroup) {
  const id = `shortcut-group-${group.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <Stack as="section" gap="3" aria-labelledby={id}>
      <Heading level={3} size="sm" id={id}>
        {group}
      </Heading>
      <ListRows size="sm" divided>
        {rows.map((r) => (
          <ListRow
            key={r.description}
            label={r.description}
            wrap
            trailing={
              <Inline gap="2" as="span">
                {r.combos.map((c) => (
                  <Kbd key={c} keys={hotkeyCaps(c)} label={hotkeyLabel(c)} />
                ))}
              </Inline>
            }
          />
        ))}
      </ListRows>
    </Stack>
  );
}

function SheetBody() {
  const [filter, setFilter] = useState('');
  // Read once per opening: the registry holds what is mounted now (the
  // shell, the workspace and the active mode).
  const defs = useMemo(() => listShortcuts(), []);
  const groups = groupShortcuts(defs, filter);
  return (
    <Stack gap="6">
      <SearchField
        label="Filter shortcuts"
        labelHidden
        placeholder="Filter shortcuts"
        value={filter}
        onChange={setFilter}
      />
      {groups.length ? (
        groups.map((g) => <Group key={g.group} {...g} />)
      ) : (
        <EmptyState size="sm" title="No shortcuts match" />
      )}
    </Stack>
  );
}

/** Every registered keyboard shortcut, grouped (spec §13.1, plan G-2). */
export function ShortcutSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Keyboard shortcuts"
    >
      {open ? <SheetBody /> : null}
    </Dialog>
  );
}
