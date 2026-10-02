/** @vitest-environment jsdom */
import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryCommands, resetCommandsForTests } from './commands';
import { useToolCommands } from './tool-commands';

afterEach(() => resetCommandsForTests());

function Harness({ run, single }: { run: () => void; single: () => void }) {
  useToolCommands('demo', [
    { id: 'copy', label: 'Copy result', shortcut: 'Mod+Shift+C', run },
    { id: 'next', label: 'Next change', shortcut: 'n', run: single },
  ]);
  return <textarea aria-label="field" />;
}

describe('useToolCommands', () => {
  it('fires modifier shortcuts everywhere, single keys only outside inputs', () => {
    const run = vi.fn();
    const single = vi.fn();
    const { getByLabelText } = render(<Harness run={run} single={single} />);
    const field = getByLabelText('field');
    fireEvent.keyDown(field, { key: 'C', ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(field, { key: 'n' });
    expect(run).toHaveBeenCalledTimes(1);
    expect(single).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(single).toHaveBeenCalledTimes(1);
  });
  it('skips disabled commands', () => {
    const run = vi.fn();
    function H() {
      useToolCommands('demo2', [
        { id: 'x', label: 'X', shortcut: 'Mod+Enter', run, enabled: false },
      ]);
      return null;
    }
    render(<H />);
    fireEvent.keyDown(document.body, { key: 'Enter', ctrlKey: true });
    expect(run).not.toHaveBeenCalled();
  });
  it('lists the commands in the palette and unregisters on unmount', () => {
    const run = vi.fn();
    function H({ label }: { label: string }) {
      useToolCommands('demo3', [
        { id: 'go', label, shortcut: 'Mod+Enter', run },
        { id: 'off', label: 'Off', run, enabled: false },
      ]);
      return null;
    }
    const { rerender, unmount } = render(<H label="Run it" />);
    rerender(<H label="Run now" />);
    const all = queryCommands('').flatMap((g) => g.commands);
    const go = all.find((c) => c.id === 'tool:demo3:go');
    expect(go).toMatchObject({ label: 'Run now', shortcut: 'Mod+Enter' });
    expect(all.find((c) => c.id === 'tool:demo3:off')?.disabled).toBe(true);
    void go?.run();
    expect(run).toHaveBeenCalledTimes(1);
    unmount();
    expect(
      queryCommands('').flatMap((g) => g.commands.map((c) => c.id)),
    ).not.toContain('tool:demo3:go');
  });
});
