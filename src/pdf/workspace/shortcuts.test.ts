/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerShortcuts } from '@/shared/lib/hotkeys';
import { workspaceShortcuts, type WorkspaceShortcutApi } from './shortcuts';

const api = () =>
  Object.fromEntries(
    [
      'undo',
      'redo',
      'exportDoc',
      'open',
      'toggleFocus',
      'toggleRail',
      'setMode',
      'zoomIn',
      'zoomOut',
      'zoomFitWidth',
      'zoom100',
      'nextPage',
      'prevPage',
      'firstPage',
      'lastPage',
      'escape',
      'find',
    ].map((k) => [k, vi.fn<(i?: number) => void>()]),
  ) as unknown as WorkspaceShortcutApi &
    Record<keyof WorkspaceShortcutApi, ReturnType<typeof vi.fn>>;

let dispose = () => {};
afterEach(() => dispose());

const press = (
  key: string,
  init: KeyboardEventInit = {},
  target: EventTarget = window,
) =>
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );

describe('workspaceShortcuts', () => {
  it('maps the spec keyboard map', () => {
    const a = api();
    dispose = registerShortcuts(workspaceShortcuts(a));
    press('z', { ctrlKey: true });
    expect(a.undo).toHaveBeenCalledTimes(1);
    press('Z', { ctrlKey: true, shiftKey: true });
    press('y', { ctrlKey: true });
    expect(a.redo).toHaveBeenCalledTimes(2);
    press('s', { ctrlKey: true });
    expect(a.exportDoc).toHaveBeenCalled();
    press('f');
    expect(a.toggleFocus).toHaveBeenCalled();
    press('\\', { ctrlKey: true });
    expect(a.toggleRail).toHaveBeenCalled();
    press('3');
    expect(a.setMode).toHaveBeenCalledWith(2);
    press('PageDown');
    press('j');
    expect(a.nextPage).toHaveBeenCalledTimes(2);
    press('k');
    expect(a.prevPage).toHaveBeenCalledTimes(1);
    press('Home');
    press('End');
    expect(a.firstPage).toHaveBeenCalled();
    expect(a.lastPage).toHaveBeenCalled();
    press('0', { ctrlKey: true });
    expect(a.zoomFitWidth).toHaveBeenCalled();
  });

  it('single letters do nothing while typing', () => {
    const a = api();
    dispose = registerShortcuts(workspaceShortcuts(a));
    const input = document.createElement('input');
    document.body.append(input);
    press('f', {}, input);
    press('1', {}, input);
    expect(a.toggleFocus).not.toHaveBeenCalled();
    expect(a.setMode).not.toHaveBeenCalled();
    input.remove();
  });
});
