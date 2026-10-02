/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerShortcuts } from '@/shared/lib/hotkeys';
import { queryCommands } from '@/shared/lib/commands';
import { workspaceShortcuts } from '@/pdf/workspace/shortcuts';
import type { WorkspaceShortcutApi } from '@/pdf/workspace/shortcuts';
import { useHelpDialogs } from './HelpDialogs';
import { groupShortcuts } from './shortcut-groups';

vi.mock('@/shared/lib/platform', () => ({ isMac: () => false }));

const api = new Proxy({} as WorkspaceShortcutApi, {
  get: () => () => {},
});

function Harness() {
  const help = useHelpDialogs();
  return (
    <>
      <label>
        Name
        <input />
      </label>
      {help.dialogs}
    </>
  );
}

let off: () => void = () => {};
beforeEach(() => {
  off = registerShortcuts(workspaceShortcuts(api));
});
afterEach(() => off());

const press = (key: string, target: Element | Window = window) =>
  act(() => {
    fireEvent.keyDown(target, { key });
  });

describe('ShortcutSheet', () => {
  it('opens with ? and lists the registered shortcuts by group', () => {
    render(<Harness />);
    expect(screen.queryByRole('dialog')).toBeNull();
    press('?');
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    const workspace = within(dialog).getByRole('region', { name: 'Workspace' });
    const undo = within(workspace).getByText('Undo').closest('li')!;
    expect(undo.textContent).toContain('Ctrl Z');
    expect(undo.querySelectorAll('kbd')).toHaveLength(2);
    // The sheet's own shortcut is listed under General.
    expect(
      within(within(dialog).getByRole('region', { name: 'General' })).getByText(
        'Show keyboard shortcuts',
      ),
    ).toBeTruthy();
  });

  it('does not open while typing in a field', () => {
    render(<Harness />);
    press('?', screen.getByRole('textbox', { name: 'Name' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('filters rows by description', () => {
    render(<Harness />);
    press('?');
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    fireEvent.change(
      within(dialog).getByRole('searchbox', { name: 'Filter shortcuts' }),
      { target: { value: 'zoom' } },
    );
    const rows = within(dialog).getAllByRole('listitem');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.textContent).toMatch(/zoom/i);
    expect(within(dialog).queryByText('Undo')).toBeNull();
  });

  it('offers a Mod+K command that opens the sheet', () => {
    render(<Harness />);
    const cmd = queryCommands('keyboard shortcuts')
      .flatMap((g) => g.commands)
      .find((c) => c.label === 'Keyboard shortcuts');
    expect(cmd).toBeTruthy();
    act(() => void cmd!.run());
    expect(
      screen.getByRole('dialog', { name: 'Keyboard shortcuts' }),
    ).toBeTruthy();
  });

  it('merges combos of one action and orders General, Workspace, then modes', () => {
    const groups = groupShortcuts(
      [
        ...workspaceShortcuts(api),
        {
          id: 'm',
          combo: 'R',
          description: 'Rotate right',
          group: 'Organize',
          run: () => {},
        },
        {
          id: 'g',
          combo: 'Mod+K',
          description: 'Open the command palette',
          group: 'General',
          run: () => {},
        },
      ],
      '',
    );
    expect(groups.map((g) => g.group)).toEqual([
      'General',
      'Workspace',
      'Organize',
    ]);
    const redo = groups[1]!.rows.find((r) => r.description === 'Redo')!;
    expect(redo.combos).toEqual(['Mod+Shift+Z', 'Mod+Y']);
  });
});
