/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlobStore } from '@/pdf/doc/blob-store';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { inProcessServices } from '@/pdf/doc/test-services';
import { makeModel, makeState } from '@/pdf/doc/test-helpers';
import type { DocumentApi } from './modes/types';
import { ExportDialog } from './ExportDialog';
import { SourceDocs } from './source-docs';

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
  const run = vi.fn(async () => ({
    bytes: new Uint8Array([1]),
    warnings: [],
    notes: [],
  }));
  const save = vi.fn();
  const onOpenChange = vi.fn();
  const ui = () => (
    <ExportDialog
      open
      onOpenChange={onOpenChange}
      session={session}
      doc={{} as DocumentApi}
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
});
