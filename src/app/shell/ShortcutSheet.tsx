import { useMemo, useState } from 'react';
import { listShortcuts } from '@/shared/lib/hotkeys';
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Heading,
  SearchInput,
  ShortcutHint,
  Stack,
} from '@/shared/ui';
import { groupShortcuts, type ShortcutGroup } from './shortcut-groups';

function Section({ group, rows }: ShortcutGroup) {
  const id = `shortcut-group-${group.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section aria-labelledby={id}>
      <Stack gap="2">
        <Heading level={3} size="sm" id={id}>
          {group}
        </Heading>
        <ul className="flex list-none flex-col divide-y divide-line">
          {rows.map((r) => (
            <li
              key={r.description}
              className="flex items-center justify-between gap-4 py-1.5 text-sm text-fg"
            >
              <span>{r.description}</span>
              <span className="flex shrink-0 items-center gap-2">
                {r.combos.map((c) => (
                  <ShortcutHint key={c} keys={c} />
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Stack>
    </section>
  );
}

function SheetBody() {
  const [filter, setFilter] = useState('');
  // Read once per opening: the registry holds what is mounted now (the
  // shell, the workspace and the active mode).
  const defs = useMemo(() => listShortcuts(), []);
  const groups = groupShortcuts(defs, filter);
  return (
    <DialogBody className="flex flex-col gap-4">
      <SearchInput
        value={filter}
        onChange={setFilter}
        aria-label="Filter shortcuts"
        placeholder="Filter shortcuts"
      />
      {groups.length ? (
        groups.map((g) => <Section key={g.group} {...g} />)
      ) : (
        <EmptyState title="No shortcuts match" />
      )}
    </DialogBody>
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
    <Dialog open={open} onOpenChange={onOpenChange} size="lg">
      <DialogHeader>
        <DialogTitle>Keyboard shortcuts</DialogTitle>
      </DialogHeader>
      {open ? <SheetBody /> : null}
    </Dialog>
  );
}
