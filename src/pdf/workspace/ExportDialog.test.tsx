/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { BlobStore } from '@/pdf/doc/blob-store';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { inProcessServices } from '@/pdf/doc/test-services';
import { makeModel, makeState } from '@/pdf/doc/test-helpers';
import type { DocumentApi } from './modes/types';
import { ExportDialog } from './ExportDialog';
import { SourceDocs } from './source-docs';
import { DEFAULT_PERMISSIONS } from '@/pdf/edit/permissions';

vi.mock('./PreviewAsExported', () => ({
  PreviewAsExported: () => <p>preview</p>,
}));

beforeAll(() => registerCoreOperations());
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

function setup(encryptedInput = false, restricted = false) {
  const model = makeModel(makeState(3, { encryptedInput, restricted }));
  const render = {
    open: vi.fn(),
    close: vi.fn(async () => {}),
    onRestart: () => () => {},
    generation: () => 0,
  };
  const session = {
    model,
    blobs: new BlobStore(null, 'doc1'),
    services: inProcessServices(),
    sourceDocs: new SourceDocs(render as never, async () => new Uint8Array()),
    db: null,
  };
  const run = vi.fn<
    (...args: unknown[]) => Promise<{
      bytes: Uint8Array;
      warnings: string[];
      notes: string[];
    }>
  >(async () => ({ bytes: new Uint8Array([1]), warnings: [], notes: [] }));
  const save = vi.fn();
  const onOpenChange = vi.fn();
  const ui = () => (
    <ExportDialog
      open
      onOpenChange={onOpenChange}
      session={session}
      doc={{ view: model.getView() } as DocumentApi}
      currentPage="ckpt0:0"
      selectedPages={[]}
      run={run}
      save={save}
    />
  );
  return { model, run, save, onOpenChange, ui };
}

describe('ExportDialog', () => {
  it('summarises changes by mode and exports under the file name', async () => {
    const { model, run, save, onOpenChange, ui } = setup();
    model.dispatch({
      type: 'page.rotate',
      params: { pageIds: ['ckpt0:0'], delta: 90 },
    });
    model.dispatch({
      type: 'page.rotate',
      params: { pageIds: ['ckpt0:1'], delta: 90 },
    });
    model.dispatch({ type: 'page.delete', params: { pageIds: ['ckpt0:2'] } });
    render(ui());
    expect(screen.getByRole('dialog', { name: 'Export PDF' })).toBeTruthy();
    expect(screen.getByText('Organize')).toBeTruthy();
    expect(screen.getByText('2 pages rotated, 1 page deleted')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'File name' })).toHaveProperty(
      'value',
      'a.edited.pdf',
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    });
    expect(run).toHaveBeenCalledWith(
      model,
      expect.anything(),
      expect.objectContaining({ filename: 'a.edited.pdf', onlyPages: null }),
      expect.anything(),
    );
    expect(save).toHaveBeenCalledWith(
      new Uint8Array([1]),
      'a.edited.pdf',
      'application/pdf',
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('says when there are no changes', () => {
    const { ui } = setup();
    render(ui());
    expect(
      screen.getByText('No changes. The export is a copy of the original.'),
    ).toBeTruthy();
  });

  it('warns that an encrypted input exports without a password', () => {
    const { ui } = setup(true);
    render(ui());
    expect(
      screen.getByText(
        'This document was opened with a password. The exported file is not password-protected.',
      ),
    ).toBeTruthy();
  });

  it('cannot export a restricted document', () => {
    const { ui } = setup(false, true);
    render(ui());
    expect(screen.getByText(/Enter its owner password/)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Export' }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('asks for passwords when protection is on and clears them after export', async () => {
    const { model, run, ui } = setup(true);
    model.dispatch({
      type: 'protect.set',
      params: { enabled: true, permissions: DEFAULT_PERMISSIONS },
    });
    const view = render(ui());
    // Protection is on: no "not password-protected" warning.
    expect(
      screen.queryByText(
        'This document was opened with a password. The exported file is not password-protected.',
      ),
    ).toBeNull();
    const pw = ['correct', 'horse'].join(' ');
    const open = screen.getByLabelText('Password to open');
    fireEvent.change(open, { target: { value: pw } });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: pw },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    });
    expect(run).toHaveBeenCalledWith(
      model,
      expect.anything(),
      expect.objectContaining({ password: pw, confirmPassword: pw }),
      expect.anything(),
    );
    view.rerender(ui());
    expect(
      (screen.getByLabelText('Password to open') as HTMLInputElement).value,
    ).toBe('');
  });

  /** An export that waits for its signal: aborting rejects it. */
  function hang(run: ReturnType<typeof setup>['run']) {
    let signal: AbortSignal | undefined;
    run.mockImplementation(
      (...args: unknown[]) =>
        new Promise((_resolve, reject) => {
          const env = args[3] as { signal?: AbortSignal };
          signal = env.signal;
          env.signal?.addEventListener('abort', () =>
            reject(new ToolError('CANCELLED', 'Cancelled')),
          );
        }) as never,
    );
    return () => signal;
  }

  it('Cancel stops the export without saving or an error', async () => {
    const { run, save, ui } = setup();
    const signal = hang(run);
    render(ui());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    });
    await act(async () => {
      const overlay = screen.getByRole('dialog', { name: 'Exporting' });
      fireEvent.click(within(overlay).getByRole('button', { name: 'Cancel' }));
    });
    expect(signal()?.aborted).toBe(true);
    expect(save).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('aborts a running export when it unmounts', async () => {
    const { run, save, ui } = setup();
    const signal = hang(run);
    const view = render(ui());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    });
    view.unmount();
    expect(signal()?.aborted).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });

  it('shows a failed export and keeps the dialog open', async () => {
    const { run, save, onOpenChange, ui } = setup();
    run.mockRejectedValue(
      new ToolError('INVALID_FILE', 'The file could not be written'),
    );
    render(ui());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    });
    expect(screen.getByText('The file could not be written')).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it.each([
    ['clears', 'INVALID_FILE', ''],
    ['keeps for a retry', 'NETWORK', 'pw'],
  ] as const)(
    '%s the secrets after a %s failure',
    async (_what, code, expected) => {
      const { model, run, ui } = setup();
      model.dispatch({
        type: 'protect.set',
        params: { enabled: true, permissions: DEFAULT_PERMISSIONS },
      });
      run.mockRejectedValue(new ToolError(code, 'It failed'));
      const view = render(ui());
      const pw = ['correct', 'horse'].join(' ');
      fireEvent.change(screen.getByLabelText('Password to open'), {
        target: { value: pw },
      });
      fireEvent.change(screen.getByLabelText('Confirm password'), {
        target: { value: pw },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Export' }));
      });
      expect(screen.getByText('It failed')).toBeTruthy();
      view.rerender(ui());
      expect(
        (screen.getByLabelText('Password to open') as HTMLInputElement).value,
      ).toBe(expected === 'pw' ? pw : '');
    },
  );
});
