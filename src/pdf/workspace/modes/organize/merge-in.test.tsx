/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import type { ModeProps } from '../types';
import {
  WorkspaceContext,
  type WorkspaceActions,
} from '../../workspace-context';
import { useMergeIn } from './merge-in';

const { loadFile, preparePdf, unlockWithPassword, notify } = vi.hoisted(() => ({
  loadFile: vi.fn(),
  preparePdf: vi.fn(),
  unlockWithPassword: vi.fn(),
  notify: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/shared/lib/files', async (orig) => ({
  ...(await orig<typeof import('@/shared/lib/files')>()),
  loadFile,
}));
vi.mock('@/pdf/qpdf/unlock', () => ({ preparePdf, unlockWithPassword }));
vi.mock('@/shared/lib/notify', () => ({ notify }));

afterEach(() => vi.clearAllMocks());

const FILE_BYTES = new Uint8Array([1, 2, 3]);
const OPEN_BYTES = new Uint8Array([4, 5, 6]);

function setup({ refused = false, pageCount = 2 } = {}) {
  const pages = ['a', 'b', 'c'].map((id) => ({ id }));
  const sources: Record<string, { pageCount: number }> = {};
  const model = {
    getState: () => ({ sources }),
    getView: () => ({ pages }),
  };
  const doc = {
    currentPage: 'b',
    services: { qpdf: {} },
    addSource: vi.fn(async () => {
      sources.src1 = { pageCount };
      return 'src1';
    }),
    removeSource: vi.fn(),
    announce: vi.fn(),
    dispatch: vi.fn<(op: unknown) => unknown[]>(() => (refused ? [] : [{}])),
  };
  const ws = { session: { model } } as unknown as WorkspaceActions;
  const ctx = { doc } as unknown as ModeProps;
  const api: { current: ReturnType<typeof useMergeIn> | null } = {
    current: null,
  };
  function Harness() {
    api.current = useMergeIn(ctx);
    return api.current.dialog;
  }
  render(
    <WorkspaceContext.Provider value={ws}>
      <Harness />
    </WorkspaceContext.Provider>,
  );
  const drop = (name = 'extra.pdf') =>
    act(() => api.current!.onFiles([new File([FILE_BYTES], name)]));
  return { doc, drop };
}

const loaded = (name = 'extra.pdf') =>
  loadFile.mockResolvedValue({ name, bytes: FILE_BYTES });

describe('useMergeIn', () => {
  it('inserts the file pages after the current page as one step', async () => {
    loaded();
    preparePdf.mockResolvedValue({
      status: 'ready',
      bytes: OPEN_BYTES,
      wasEncrypted: false,
    });
    const { doc, drop } = setup();
    await drop();
    expect(loadFile).toHaveBeenCalledWith(expect.any(File), ['pdf']);
    expect(doc.addSource).toHaveBeenCalledWith(OPEN_BYTES, 'extra.pdf');
    expect(doc.dispatch).toHaveBeenCalledTimes(1);
    const op = doc.dispatch.mock.calls[0][0] as unknown as {
      type: string;
      params: { sourceId: string; at: number; newIds: string[] };
    };
    expect(op.type).toBe('page.mergeIn');
    expect(op.params.sourceId).toBe('src1');
    expect(op.params.at).toBe(2);
    expect(op.params.newIds).toHaveLength(2);
    expect(new Set(op.params.newIds).size).toBe(2);
    expect(doc.announce).toHaveBeenCalledWith(
      'Inserted 2 pages from extra.pdf',
    );
    expect(doc.removeSource).not.toHaveBeenCalled();
  });

  it('a refused insert removes the added source', async () => {
    loaded();
    preparePdf.mockResolvedValue({ status: 'ready', bytes: OPEN_BYTES });
    const { doc, drop } = setup({ refused: true, pageCount: 1 });
    await drop();
    expect(doc.removeSource).toHaveBeenCalledWith('src1');
    expect(doc.announce).not.toHaveBeenCalled();
  });

  it('a file that is not a PDF shows the error and changes nothing', async () => {
    loadFile.mockRejectedValue(
      new ToolError('INVALID_FILE', 'notes.txt is not a PDF file'),
    );
    const { doc, drop } = setup();
    await drop('notes.txt');
    expect(notify.error).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_FILE' }),
    );
    expect(doc.addSource).not.toHaveBeenCalled();
    expect(doc.dispatch).not.toHaveBeenCalled();
  });

  it('asks for the password of a protected file, then merges', async () => {
    loaded('locked.pdf');
    preparePdf.mockResolvedValue({ status: 'locked' });
    unlockWithPassword
      .mockRejectedValueOnce(
        new ToolError('WRONG_PASSWORD', 'That password is not right'),
      )
      .mockResolvedValueOnce(OPEN_BYTES);
    const { doc, drop } = setup();
    await drop('locked.pdf');
    expect(doc.addSource).not.toHaveBeenCalled();
    const field = await screen.findByLabelText('Password for locked.pdf');
    fireEvent.change(field, { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Merge in' }));
    expect(await screen.findByText('That password is not right')).toBeTruthy();
    expect(doc.dispatch).not.toHaveBeenCalled();

    fireEvent.change(field, { target: { value: 'right' } });
    fireEvent.click(screen.getByRole('button', { name: 'Merge in' }));
    await waitFor(() => expect(doc.dispatch).toHaveBeenCalledTimes(1));
    expect(unlockWithPassword).toHaveBeenLastCalledWith(
      FILE_BYTES,
      'right',
      doc.services.qpdf,
    );
    expect(doc.addSource).toHaveBeenCalledWith(OPEN_BYTES, 'locked.pdf');
    expect(screen.queryByLabelText('Password for locked.pdf')).toBeNull();
  });

  it('skipping a protected file closes the prompt without a change', async () => {
    loaded('locked.pdf');
    preparePdf.mockResolvedValue({ status: 'locked' });
    const { doc, drop } = setup();
    await drop('locked.pdf');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Skip this file' }),
    );
    await waitFor(() =>
      expect(screen.queryByLabelText('Password for locked.pdf')).toBeNull(),
    );
    expect(unlockWithPassword).not.toHaveBeenCalled();
    expect(doc.addSource).not.toHaveBeenCalled();
  });

  it('an unlock failure other than the password closes the prompt', async () => {
    loaded('locked.pdf');
    preparePdf.mockResolvedValue({ status: 'locked' });
    unlockWithPassword.mockRejectedValue(
      new ToolError('INVALID_FILE', 'The file is damaged'),
    );
    const { doc, drop } = setup();
    await drop('locked.pdf');
    fireEvent.change(await screen.findByLabelText('Password for locked.pdf'), {
      target: { value: 'pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Merge in' }));
    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'INVALID_FILE' }),
      ),
    );
    expect(screen.queryByLabelText('Password for locked.pdf')).toBeNull();
    expect(doc.addSource).not.toHaveBeenCalled();
  });
});
