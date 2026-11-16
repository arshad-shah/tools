/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { putHandoff } from '@/shared/lib/handoff';
import { viewerSettings } from '../settings';
import { Shell } from './Shell';

vi.mock('@/shared/ui/diagram-canvas', () => ({ DiagramCanvas: () => null }));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  localStorage.clear();
  // Settings (the shown tab among them) live in memory between tests.
  renderHook(() => viewerSettings.useSettings()).result.current[2]();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});

const settle = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });
};

function mount() {
  return render(
    <MemoryRouter>
      <Shell />
    </MemoryRouter>,
  );
}

const editor = () =>
  screen.getByRole('textbox', { name: 'Document' }) as HTMLTextAreaElement;

async function type(text: string) {
  fireEvent.change(editor(), { target: { value: text } });
  await settle();
}

describe('Shell', () => {
  it('shows a parse error with a working Jump to error', async () => {
    mount();
    await type('{\n  "a": 1,\n}');
    expect(screen.getByTestId('parse-error').textContent).toContain(
      'line 3, column 1',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Jump to error' }));
    expect(editor().selectionStart).toBe('{\n  "a": 1,\n'.length);
  });

  const views = () =>
    screen
      .getByRole('radiogroup', { name: 'View' })
      .querySelectorAll<HTMLInputElement>('input[type="radio"]');
  const checked = (name: string) =>
    (screen.getByRole('radio', { name }) as HTMLInputElement).checked;

  it('shows Source, Tree, Map, Query and Convert as views, Source first', async () => {
    mount();
    expect([...views()].map((r) => r.value)).toEqual([
      'source',
      'tree',
      'map',
      'query',
      'convert',
    ]);
    expect(checked('Source')).toBe(true);
    // A view before any document says why it is empty.
    fireEvent.click(screen.getByRole('radio', { name: 'Tree' }));
    expect(screen.getByText('No document yet')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Document' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Go to Source' }));
    expect(editor()).toBeTruthy();
  });

  it('switches views with Alt+4 and back with Alt+2', async () => {
    mount();
    await type('{"a":1}');
    fireEvent.keyDown(window, { key: '4', code: 'Digit4', altKey: true });
    await settle();
    expect(checked('Query')).toBe(true);
    fireEvent.keyDown(window, { key: '2', code: 'Digit2', altKey: true });
    await settle();
    expect(checked('Tree')).toBe(true);
  });

  it('Format re-indents the document', async () => {
    mount();
    await type('{"a":[1]}');
    fireEvent.keyDown(window, {
      key: 'F',
      code: 'KeyF',
      ctrlKey: true,
      shiftKey: true,
    });
    await settle();
    expect(editor().value).toBe('{\n  "a": [\n    1\n  ]\n}\n');
  });

  it('offers rows as CSV only for an array of objects', async () => {
    mount();
    await type('{"a":1}');
    fireEvent.click(screen.getByRole('button', { name: 'Send to' }));
    expect(screen.getByRole('menu').textContent).toContain('Document');
    expect(screen.getByRole('menu').textContent).not.toContain('As CSV');
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await type('[{"a":1},{"a":2}]');
    fireEvent.click(screen.getByRole('button', { name: 'Send to' }));
    expect(screen.getByRole('menu').textContent).toContain('As CSV');
  });

  it('fills the editor once from a JSON hand-off', async () => {
    const id = putHandoff({
      kind: 'text',
      mime: 'application/json',
      text: '{"from":"csv"}',
      sourceTool: 'csv-viewer',
    });
    window.history.replaceState(null, '', `/data/json-xml?handoff=${id}`);
    mount();
    await settle();
    expect(editor().value).toBe('{"from":"csv"}');
    expect(window.location.search).toBe('');
  });
});
