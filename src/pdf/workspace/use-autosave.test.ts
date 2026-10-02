/** @vitest-environment jsdom */
import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import { newId } from '@/shared/lib/id';
import { openIdb, WORKSPACE_DB } from '@/shared/lib/storage';
import { BlobStore } from '@/pdf/doc/blob-store';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { makeModel, makeState } from '@/pdf/doc/test-helpers';
import type { WorkspaceSession } from './session';
import { useAutosave } from './use-autosave';

beforeAll(() => registerCoreOperations());

const ui = () => ({
  mode: 'organize' as const,
  viewport: { page: 1, zoom: { kind: 'fit-width' as const } },
});

async function session(patch: Parameters<typeof makeState>[1]) {
  const db = await openIdb(
    { ...WORKSPACE_DB, name: `t-${newId()}` },
    indexedDB,
  );
  const model = makeModel(makeState(2, patch));
  return {
    model,
    db,
    blobs: new BlobStore(db, 'doc1'),
    services: {} as WorkspaceSession['services'],
    sourceDocs: { get: () => undefined } as never,
  } satisfies WorkspaceSession;
}

describe('useAutosave', () => {
  it('keeps saving off for an encrypted input by default', async () => {
    const s = await session({ encryptedInput: true });
    const { result, unmount } = renderHook(() => useAutosave(s, ui));
    expect(result.current.status).toBe('off');
    unmount();
    s.db.close();
  });

  it('restores an encrypted document the user chose to save with saving on', async () => {
    const s = await session({ encryptedInput: true, saveOptIn: true });
    const { result, unmount } = renderHook(() => useAutosave(s, ui));
    expect(result.current.status).toBe('saving');
    unmount();
    s.db.close();
  });

  it('records the choice in the document', async () => {
    const s = await session({ encryptedInput: true });
    const { result, unmount } = renderHook(() => useAutosave(s, ui));
    act(() => result.current.setEnabled(true));
    expect(s.model.getState().saveOptIn).toBe(true);
    act(() => result.current.setEnabled(false));
    expect(s.model.getState().saveOptIn).toBeUndefined();
    unmount();
    s.db.close();
  });

  it('STORAGE_FULL offers Clear old documents, which saves again at once', async () => {
    const s = await session({});
    let full = true;
    const write = s.db.write.bind(s.db);
    s.db.write = (stores, fn) =>
      full && stores.includes('logs')
        ? Promise.reject(new ToolError('STORAGE_FULL', 'Storage is full'))
        : write(stores, fn);
    const error = vi.spyOn(notify, 'error').mockImplementation(() => '');
    const { result, unmount } = renderHook(() => useAutosave(s, ui));
    await act(() => result.current.flush());
    await waitFor(() => expect(error).toHaveBeenCalled());
    expect(result.current.status).toBe('error');
    const [, opts] = error.mock.calls[0] as [
      unknown,
      { action: { label: string; onClick(): void } },
    ];
    expect(opts.action.label).toBe('Clear old documents');
    full = false;
    act(() => opts.action.onClick());
    await waitFor(() => expect(result.current.status).toBe('saved'));
    expect(await s.db.get('logs', 'doc1')).toBeDefined();
    error.mockRestore();
    unmount();
    s.db.close();
  });
});
