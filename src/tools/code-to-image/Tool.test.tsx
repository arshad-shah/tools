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
import { codeImageSettings } from './settings';
import CodeToImage from './Tool';

// jsdom cannot draw: the surface renders a tiny PNG and its layout size.
vi.mock('@/shared/surfaces/code-image/render', () => ({
  renderCodeImagePng: vi.fn(async () => ({
    blob: new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], {
      type: 'image/png',
    }),
    layout: { width: 400, height: 200 },
  })),
  renderCodeImageSvg: vi.fn(
    async () => '<svg xmlns="http://www.w3.org/2000/svg"/>',
  ),
}));
vi.mock('@/shared/lib/download', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/download')>()),
  saveBlob: vi.fn(),
}));
vi.mock('@/shared/lib/notify', () => ({
  notify: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

beforeEach(() => {
  localStorage.clear();
  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
  const { result, unmount } = renderHook(() => codeImageSettings.useSettings());
  act(() => result.current[2]());
  unmount();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renderTool = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CodeToImage />
    </MemoryRouter>,
  );

describe('CodeToImage', () => {
  it('previews pasted code and downloads PNG and SVG named from the title', async () => {
    renderTool();
    expect(screen.getByText('No code yet')).toBeTruthy();
    // One call to action while empty: the example sits in the empty state
    // only, and the exports wait for an image.
    expect(
      screen.getAllByRole('button', { name: 'Try an example' }),
    ).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Download PNG' })).toBeNull();
    setEditorValue(screen.getByRole('textbox', { name: 'Code' }), 'let a = 1;');
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'demo.js' },
    });
    expect(
      await screen.findByRole('img', { name: 'Preview of the code image' }),
    ).toBeTruthy();
    expect(screen.getByText('800 by 400 pixels')).toBeTruthy();

    const { saveBlob } = await import('@/shared/lib/download');
    fireEvent.click(screen.getByRole('button', { name: 'Download PNG' }));
    await waitFor(() =>
      expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'demo.png'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Download SVG' }));
    await waitFor(() =>
      expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'demo.svg'),
    );
  });

  it('reports a bad highlight range under the field', () => {
    renderTool();
    fireEvent.change(screen.getByRole('textbox', { name: 'Highlight lines' }), {
      target: { value: '3, abc' },
    });
    expect(
      screen.getByText('"abc" is not a line number or a range such as 4-6'),
    ).toBeTruthy();
  });

  it('copying without clipboard image support shows a clear error', async () => {
    vi.stubGlobal('ClipboardItem', undefined);
    renderTool();
    setEditorValue(screen.getByRole('textbox', { name: 'Code' }), 'x');
    expect(
      await screen.findByText(
        'This browser cannot copy images; download the PNG instead.',
      ),
    ).toBeTruthy();
    const copy = await screen.findByRole('button', { name: 'Copy image' });
    await waitFor(() => expect(copy).toHaveProperty('disabled', false));
    fireEvent.click(copy);
    const { notify } = await import('@/shared/lib/notify');
    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'UNSUPPORTED_FEATURE' }),
      ),
    );
  });

  it('takes code handed over with its language and file name', async () => {
    const id = putHandoff({
      kind: 'text',
      mime: 'application/sql',
      text: 'select 1;',
      sourceTool: 'code-formatter',
      filename: 'query.sql',
    });
    renderTool(`/media/code-image?${HANDOFF_PARAM}=${id}`);
    const editor = screen.getByRole('textbox', { name: 'Code' });
    await waitFor(() => expect(editorValue(editor)).toBe('select 1;'));
    expect(
      (screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement)
        .value,
    ).toBe('query.sql');
    expect(codeImageSettings.getSettings().language).toBe('sql');
  });
});
