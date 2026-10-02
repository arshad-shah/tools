/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ModeProps } from '../types';
import {
  WorkspaceContext,
  type WorkspaceActions,
} from '../../workspace-context';
import { SplitDialog } from './SplitDialog';

const { saveZip, notify, splitDocument } = vi.hoisted(() => ({
  saveZip: vi.fn<(files: unknown[], name: string) => Promise<void>>(
    async () => {},
  ),
  notify: { success: vi.fn(), error: vi.fn() },
  splitDocument: vi.fn(),
}));

vi.mock('@/shared/lib/download', async (orig) => ({
  ...(await orig<typeof import('@/shared/lib/download')>()),
  saveZip,
}));
vi.mock('@/shared/lib/notify', () => ({ notify }));
vi.mock('./split-extract', async (orig) => {
  const real = await orig<typeof import('./split-extract')>();
  // The real grouping (and its validation); fake bytes per part.
  splitDocument.mockImplementation(
    async (
      model: { getView(): { pages: { id: string }[] } },
      _blobs: unknown,
      at: 'selected' | { every: number },
      selected: ReadonlySet<string>,
    ) =>
      real
        .splitGroups(
          model.getView().pages.map((p) => p.id),
          at,
          selected,
        )
        .map((ids, i) => ({
          name: `report-part-${i + 1}.pdf`,
          bytes: new Uint8Array(ids.length),
        })),
  );
  return { ...real, splitDocument };
});

afterEach(() => vi.clearAllMocks());

function setup(selected: string[] = []) {
  const pages = Array.from({ length: 4 }, (_, i) => ({ id: `p${i}` }));
  const model = {
    getView: () => ({ pages }),
    getState: () => ({ name: 'report.pdf' }),
  };
  const runJob = vi.fn(
    async (_title: string, fn: (job: object) => Promise<unknown>) =>
      fn({ signal: new AbortController().signal, progress: () => {} }),
  );
  const ws = {
    session: { model, blobs: {}, services: {} },
    runJob,
  } as unknown as WorkspaceActions;
  const ctx = {
    selection: { pages: new Set(selected) },
  } as unknown as ModeProps;
  const onOpenChange = vi.fn();
  render(
    <WorkspaceContext.Provider value={ws}>
      <SplitDialog open onOpenChange={onOpenChange} ctx={ctx} />
    </WorkspaceContext.Provider>,
  );
  return { runJob, onOpenChange };
}

const split = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Split' }));
const every = () => screen.getByLabelText('Pages per file') as HTMLInputElement;

describe('SplitDialog', () => {
  it('splits every N pages and saves the parts as one ZIP', async () => {
    const { runJob, onOpenChange } = setup();
    fireEvent.change(every(), { target: { value: '2' } });
    split();
    await waitFor(() => expect(saveZip).toHaveBeenCalled());
    expect(runJob).toHaveBeenCalledWith('Splitting', expect.any(Function));
    expect(splitDocument.mock.calls[0][2]).toEqual({ every: 2 });
    expect(saveZip).toHaveBeenCalledWith(
      [
        { name: 'report-part-1.pdf', data: new Uint8Array(2) },
        { name: 'report-part-2.pdf', data: new Uint8Array(2) },
      ],
      'report.split.zip',
    );
    expect(notify.success).toHaveBeenCalledWith('Saved 2 files');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('splits at the selected pages', async () => {
    setup(['p1', 'p3']);
    fireEvent.click(screen.getByRole('radio', { name: 'At selected pages' }));
    expect(screen.queryByLabelText('Pages per file')).toBeNull();
    split();
    await waitFor(() => expect(saveZip).toHaveBeenCalled());
    expect(splitDocument.mock.calls[0][2]).toBe('selected');
    expect(saveZip.mock.calls[0][0]).toHaveLength(3);
    expect(notify.success).toHaveBeenCalledWith('Saved 3 files');
  });

  it('Cancel closes without splitting', () => {
    const { runJob, onOpenChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(runJob).not.toHaveBeenCalled();
  });

  it('stays open and explains when no page starts a new part', async () => {
    const { runJob, onOpenChange } = setup([]);
    fireEvent.click(screen.getByRole('radio', { name: 'At selected pages' }));
    split();
    await waitFor(() => expect(notify.error).toHaveBeenCalled());
    expect(notify.error.mock.calls[0][0]).toMatchObject({
      code: 'INVALID_INPUT',
      message: 'Select the pages where each new part should start',
    });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(runJob).not.toHaveBeenCalled();
    expect(saveZip).not.toHaveBeenCalled();
  });

  it('stays open when the document is too short for N', async () => {
    const { onOpenChange } = setup();
    fireEvent.change(every(), { target: { value: '4' } });
    split();
    await waitFor(() => expect(notify.error).toHaveBeenCalled());
    expect(notify.error.mock.calls[0][0]).toMatchObject({
      message: 'The document is not long enough to split that way',
    });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('a cancelled job saves nothing', async () => {
    const { runJob } = setup();
    runJob.mockResolvedValueOnce(null);
    split();
    await waitFor(() => expect(runJob).toHaveBeenCalled());
    expect(saveZip).not.toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
  });
});
