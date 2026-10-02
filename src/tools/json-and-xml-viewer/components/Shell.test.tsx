/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { putHandoff } from '@/shared/lib/handoff';
import { Shell } from './Shell';

vi.mock('@/shared/ui/diagram-canvas', () => ({ DiagramCanvas: () => null }));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  localStorage.clear();
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

  it('switches tabs with Alt+3 and back with Alt+1', async () => {
    mount();
    await type('{"a":1}');
    fireEvent.keyDown(window, { key: '3', code: 'Digit3', altKey: true });
    await settle();
    expect(
      screen.getByRole('tab', { name: 'Query' }).getAttribute('aria-selected'),
    ).toBe('true');
    fireEvent.keyDown(window, { key: '1', code: 'Digit1', altKey: true });
    await settle();
    expect(
      screen.getByRole('tab', { name: 'Tree' }).getAttribute('aria-selected'),
    ).toBe('true');
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

  it('offers Send as CSV only for an array of objects', async () => {
    mount();
    await type('{"a":1}');
    expect(screen.queryByRole('button', { name: 'Send as CSV' })).toBeNull();
    await type('[{"a":1},{"a":2}]');
    expect(screen.getByRole('button', { name: 'Send as CSV' })).toBeTruthy();
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
