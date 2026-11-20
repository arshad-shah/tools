/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { editorValue, setEditorValue } from '@/shared/editor/testing';
import { HANDOFF_PARAM, putHandoff } from '@/shared/lib/handoff';
import { jsonToTypesSettings } from './settings';
import JsonToTypes from './Tool';

vi.mock('@/shared/lib/download', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/download')>()),
  saveBlob: vi.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  // Settings live in a module store: start each test from the defaults.
  const { result, unmount } = renderHook(() =>
    jsonToTypesSettings.useSettings(),
  );
  act(() => result.current[2]());
  unmount();
});
afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

const input = () => screen.getByRole('textbox', { name: 'JSON input' });
const output = (label: string) =>
  screen.getByRole('textbox', { name: `${label} output` });

const renderTool = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <JsonToTypes />
    </MemoryRouter>,
  );

describe('JsonToTypes', () => {
  it('offers the examples once: in the empty state, then under the input', async () => {
    renderTool();
    expect(
      screen.getAllByRole('button', { name: 'Try an example' }),
    ).toHaveLength(1);
    setEditorValue(input(), '{"id": 1}');
    await waitFor(() => expect(screen.queryByText('No JSON yet')).toBeNull());
    expect(
      screen.getAllByRole('button', { name: 'Try an example' }),
    ).toHaveLength(1);
  });

  it('shows TypeScript for pasted JSON and follows the language choice', async () => {
    renderTool();
    expect(screen.getByText('No JSON yet')).toBeTruthy();
    setEditorValue(input(), '{"id": 1, "tags": ["a"]}');
    await waitFor(() =>
      expect(editorValue(output('TypeScript'))).toBe(
        'export interface Root {\n  id: number;\n  tags: string[];\n}\n',
      ),
    );
    expect(screen.getByText('1 sample, 1 type')).toBeTruthy();

    fireEvent.change(screen.getByRole('textbox', { name: 'Root type name' }), {
      target: { value: 'Post' },
    });
    await waitFor(() =>
      expect(editorValue(output('TypeScript'))).toContain(
        'export interface Post {',
      ),
    );
  });

  it('marks bad JSON with its line', async () => {
    renderTool();
    setEditorValue(input(), '{\n  "a": 1,\n}');
    expect(await screen.findByText('Not valid JSON')).toBeTruthy();
    expect(
      screen.getByText("Line 3, column 1: Trailing comma before '}'"),
    ).toBeTruthy();
    expect(screen.getByText('Fix the JSON to see types')).toBeTruthy();
  });

  it('downloads the output with the language extension', async () => {
    renderTool();
    setEditorValue(input(), '{"a": true}');
    const button = await screen.findByRole('button', {
      name: 'Download Root.ts',
    });
    fireEvent.click(button);
    const { saveBlob } = await import('@/shared/lib/download');
    expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'Root.ts');
    fireEvent.click(screen.getByRole('combobox', { name: 'Language' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Go' }));
    expect(
      await screen.findByRole('button', { name: 'Download Root.go' }),
    ).toBeTruthy();
    expect(editorValue(output('Go'))).toContain('A bool `json:"a"`');
  });

  it('takes JSON handed over from another tool', async () => {
    const id = putHandoff({
      kind: 'text',
      mime: 'application/json',
      text: '{"x": 1.5}',
      sourceTool: 'json-and-xml-viewer',
    });
    renderTool(`/data/json-to-types?${HANDOFF_PARAM}=${id}`);
    await waitFor(() => expect(editorValue(input())).toBe('{"x": 1.5}'));
    await waitFor(() =>
      expect(editorValue(output('TypeScript'))).toContain('x: number;'),
    );
  });
});
