/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, createElement, useEffect, useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlobStore } from '@/pdf/doc/blob-store';
import { makeModel, makeState } from '@/pdf/doc/test-helpers';
import type { DocInfo } from '@/pdf/render';

const render = { open: vi.fn(), close: vi.fn(async () => {}) };
const pending = new Map<string, (info: DocInfo) => void>();

vi.mock('./workspace-db', () => ({ getWorkspaceDb: async () => ({}) }));
const original = new Uint8Array([7, 7, 7]);
vi.mock('@/pdf/doc/recent', () => ({
  restoreDocument: async () => {
    const blobs = new BlobStore(null, 'doc1');
    blobs.addOriginal(original);
    return {
      state: makeState(1, { restricted: true }),
      ui: {
        mode: 'organize',
        viewport: { page: 1, zoom: { kind: 'fit-width' } },
      },
      blobs,
    };
  },
}));
vi.mock('@/pdf/doc/services', () => ({
  getServices: () => ({
    render: { ...render, onRestart: () => () => {}, generation: () => 0 },
    qpdf: {},
  }),
}));
vi.mock('./open-flow', () => ({
  // Resolves when the test says the worker finished parsing `file`.
  openFile: (file: { name: string }) =>
    new Promise((resolve) =>
      pending.set(file.name, (info) =>
        resolve({
          status: 'ready',
          model: makeModel(),
          blobs: new BlobStore(null, 'doc1'),
          info,
        }),
      ),
    ),
}));

const { useWorkspaceDocument } = await import('./use-workspace-document');

const file = (name: string) => ({ name, bytes: new Uint8Array([1]) }) as never;
const info = (docId: string): DocInfo => ({ docId, pageCount: 1, pages: [] });

afterEach(() => {
  pending.clear();
  render.close.mockClear();
});

describe('useWorkspaceDocument', () => {
  it('the latest open wins and an earlier one that lands later is closed', async () => {
    const { result } = renderHook(() => useWorkspaceDocument());
    act(() => void result.current.open(file('a.pdf')));
    act(() => void result.current.open(file('b.pdf')));
    await waitFor(() => expect(pending.size).toBe(2));
    await act(async () => pending.get('b.pdf')!(info('B')));
    await waitFor(() => expect(result.current.phase.kind).toBe('ready'));
    await act(async () => pending.get('a.pdf')!(info('A')));
    await waitFor(() => expect(render.close).toHaveBeenCalledWith('A'));
    const phase = result.current.phase;
    expect(
      phase.kind === 'ready' && phase.session.sourceDocs.get('s0'),
    ).toMatchObject({ docId: 'B' });
  });

  it('closes a document that finishes opening after unmount', async () => {
    const { result, unmount } = renderHook(() => useWorkspaceDocument());
    act(() => void result.current.open(file('a.pdf')));
    await waitFor(() => expect(pending.size).toBe(1));
    unmount();
    await act(async () => pending.get('a.pdf')!(info('A')));
    await waitFor(() => expect(render.close).toHaveBeenCalledWith('A'));
  });

  it('a restored restricted document comes back with its original', async () => {
    const { result } = renderHook(() => useWorkspaceDocument());
    await act(async () => result.current.restore('doc1'));
    const phase = result.current.phase;
    expect(phase.kind).toBe('ready');
    expect(phase.kind === 'ready' && phase.original).toEqual(original);
  });

  it('an open started once survives the StrictMode remount', async () => {
    const { result } = renderHook(
      () => {
        const ws = useWorkspaceDocument();
        const once = useRef(false);
        useEffect(() => {
          if (once.current) return;
          once.current = true;
          void ws.open(file('once.pdf'));
        });
        return ws;
      },
      { wrapper: ({ children }) => createElement(StrictMode, null, children) },
    );
    await waitFor(() => expect(pending.has('once.pdf')).toBe(true));
    await act(async () => pending.get('once.pdf')!(info('O')));
    await waitFor(() => expect(result.current.phase.kind).toBe('ready'));
    expect(render.close).not.toHaveBeenCalledWith('O');
  });
});
