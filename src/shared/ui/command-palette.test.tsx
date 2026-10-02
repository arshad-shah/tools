/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerCommandSource,
  resetCommandsForTests,
  type Command,
} from '@/shared/lib/commands';
import { notify } from '@/shared/lib/notify';
import { CommandPalette } from './command-palette';
import { useCommandPaletteHotkey } from './use-command-palette-hotkey';

vi.mock('@/shared/lib/notify', () => ({
  notify: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const runs = { merge: vi.fn(), split: vi.fn(), locked: vi.fn() };
/** Commands run after the palette has unmounted. */
const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

function App() {
  const [open, setOpen] = useState(false);
  useCommandPaletteHotkey(setOpen);
  return (
    <>
      <button type="button">Before</button>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}

let off: () => void = () => {};
beforeEach(() => {
  localStorage.clear();
  resetCommandsForTests();
  const commands: Command[] = [
    { id: 'merge', label: 'Merge PDFs', group: 'Tools', run: runs.merge },
    { id: 'split', label: 'Split PDF', group: 'Tools', run: runs.split },
    {
      id: 'locked',
      label: 'Redact',
      group: 'Modes',
      disabled: 'Open a document first',
      run: runs.locked,
    },
  ];
  off = registerCommandSource({ id: 't', commands: () => commands });
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');
});
afterEach(() => {
  off();
  vi.restoreAllMocks();
  Object.values(runs).forEach((r) => r.mockReset());
});

const openWithHotkey = () =>
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
    );
  });

describe('CommandPalette', () => {
  it('opens on Mod+K with the field focused', () => {
    render(<App />);
    openWithHotkey();
    const box = screen.getByRole('combobox');
    expect(document.activeElement).toBe(box);
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(
      screen.getAllByRole('group').map((g) => g.getAttribute('aria-label')),
    ).toEqual(['Tools', 'Modes']);
  });

  it('typing filters', () => {
    render(<App />);
    openWithHotkey();
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'split' },
    });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Split PDF',
    ]);
  });

  it('ArrowDown then Enter closes and runs the second command', async () => {
    render(<App />);
    openWithHotkey();
    const box = screen.getByRole('combobox');
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    const active = box.getAttribute('aria-activedescendant')!;
    expect(document.getElementById(active)?.textContent).toBe('Split PDF');
    expect(document.getElementById(active)?.getAttribute('aria-selected')).toBe(
      'true',
    );
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(screen.queryByRole('dialog')).toBeNull();
    await flush();
    expect(runs.split).toHaveBeenCalledTimes(1);
  });

  it('a disabled command does not run and states its reason', () => {
    render(<App />);
    openWithHotkey();
    const box = screen.getByRole('combobox');
    fireEvent.keyDown(box, { key: 'End' });
    const option = document.getElementById(
      box.getAttribute('aria-activedescendant')!,
    )!;
    expect(option.getAttribute('aria-disabled')).toBe('true');
    const reason = document.getElementById(
      option.getAttribute('aria-describedby')!,
    );
    expect(reason?.textContent).toBe('Open a document first');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(runs.locked).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('Esc closes and restores focus', () => {
    render(<App />);
    const before = screen.getByRole('button', { name: 'Before' });
    before.focus();
    openWithHotkey();
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(before);
  });

  it('shows an empty state with the query', () => {
    render(<App />);
    openWithHotkey();
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'zzz' },
    });
    expect(screen.getByRole('status').textContent).toContain(
      'No commands match',
    );
  });

  it('a command that moves focus keeps it (no restore over it)', async () => {
    const target = document.createElement('input');
    document.body.append(target);
    runs.merge.mockImplementation(() => target.focus());
    render(<App />);
    screen.getByRole('button', { name: 'Before' }).focus();
    openWithHotkey();
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    await flush();
    expect(runs.merge).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(target);
    target.remove();
  });

  it('a rejected async command is reported, not swallowed', async () => {
    runs.merge.mockImplementation(() => Promise.reject(new Error('boom')));
    render(<App />);
    openWithHotkey();
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    await flush();
    await flush();
    expect(notify.error).toHaveBeenCalledTimes(1);
  });

  it('keeps one persistent status region with the result count', () => {
    render(<App />);
    openWithHotkey();
    const status = screen.getByRole('status');
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'split' },
    });
    expect(screen.getByRole('status')).toBe(status);
    expect(status.textContent).toBe('1 result');
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'zzz' },
    });
    expect(status.textContent).toBe('No commands match "zzz"');
  });
});
