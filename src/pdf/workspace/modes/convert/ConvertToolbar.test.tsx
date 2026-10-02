/** @vitest-environment jsdom */
import { cloneElement } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { encodePng } from '../../../../../test/fixtures/images';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { shellHarness, stubLayoutApis } from '../../test-shell';
import { requestConvert } from './ui-store';

beforeAll(() => registerCoreOperations());
beforeEach(() => stubLayoutApis());
afterEach(() => vi.restoreAllMocks());

async function open() {
  const h = shellHarness();
  const edit = vi.fn<(...args: unknown[]) => Promise<Uint8Array>>(async () =>
    Uint8Array.of(1, 2, 3),
  );
  (h.session.services.edit as { call: unknown }).call = edit;
  render(cloneElement(h.ui, { mode: 'convert' }));
  const toolbar = await screen.findByRole('toolbar', { name: 'Convert tools' });
  return { ...h, toolbar, edit };
}

const png = () =>
  new File(
    [encodePng(2, 2, new Uint8Array(16).fill(9)) as Uint8Array<ArrayBuffer>],
    'photo.png',
    { type: 'image/png' },
  );

describe('Convert mode', () => {
  it('offers every export and states that Markdown is best effort', async () => {
    const { toolbar } = await open();
    for (const name of [
      'Pages to images',
      'Text',
      'Markdown (best-effort structure)',
      'Selected pages as PDF',
      'Insert images as pages',
    ])
      expect(within(toolbar).getByRole('button', { name })).toBeTruthy();
    expect(document.body.textContent).toContain(
      'Markdown is a best-effort structural conversion',
    );
  });

  it('inserts picked images as pages after the current page, one undo step', async () => {
    const { model, edit } = await open();
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await act(async () => {
      fireEvent.change(input, { target: { files: [png()] } });
    });
    await waitFor(() =>
      expect(model.getState().log.at(-1)?.type).toBe('page.insertImages'),
    );
    expect(edit).toHaveBeenCalledWith(
      'imagesToPdf',
      [
        [expect.objectContaining({ kind: 'png', name: 'photo.png' })],
        { pageSize: 'fit', orientation: 'auto', marginPt: 0 },
      ],
      expect.anything(),
    );
    // The harness render opens every source as 3 pages.
    const pages = model.getView().pages;
    expect(pages).toHaveLength(6);
    expect(pages[0].id).toBe('ckpt0:0');
    expect(pages[1].source).not.toBe('s0');
    expect(pages[4].id).toBe('ckpt0:1');
    model.undo();
    expect(model.getView().pages).toHaveLength(3);
  });

  it('rejects a file that is not an image without changing the document', async () => {
    const { model } = await open();
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File(['hello'], 'notes.txt')] },
      });
    });
    await waitFor(() =>
      expect(document.body.textContent).toContain(
        'notes.txt is not a PNG, JPEG, WebP or GIF file',
      ),
    );
    expect(model.getState().log).toHaveLength(0);
  });

  it('runs palette requests through the mounted toolbar', async () => {
    const { model, edit, session } = await open();
    session.blobs.addCheckpoint(model.currentCheckpoint(), Uint8Array.of(1));
    await act(async () => requestConvert('text'));
    // Text export materialises the view in the edit worker.
    await waitFor(() => expect(edit).toHaveBeenCalled());
    expect(edit.mock.calls[0][0]).toBe('materialize');
    expect(model.getState().log).toHaveLength(0);
  });
});
