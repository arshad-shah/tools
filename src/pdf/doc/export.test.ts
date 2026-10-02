import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  makeMetadataPdf,
  makeTextPdf,
  pdfPageTexts,
} from '../../../test/fixtures/builders';
import { BlobStore } from './blob-store';
import { exportDocument } from './export';
import { EXPORT_STAGES, type ExportStage } from './export-stages';
import { registerCoreOperations } from './ops';
import { inProcessServices } from './test-services';
import { makeModel, makeState } from './test-helpers';

const options = (patch = {}) => ({
  filename: 'a.edited.pdf',
  onlyPages: null,
  stripMetadata: false,
  ...patch,
});
const env = (signal = new AbortController().signal) => ({
  services: inProcessServices({
    qpdf: {
      optimize: vi.fn(async (b: Uint8Array) => ({ bytes: b, warnings: [] })),
    } as never,
  }),
  signal,
  progress: () => {},
});

async function setup(input?: Uint8Array) {
  const bytes = input ?? (await makeTextPdf({ pages: 3, label: 'Alpha' }));
  const pages = (await PDFDocument.load(bytes)).getPageCount();
  const model = makeModel(makeState(pages));
  const blobs = new BlobStore(null, 'doc1');
  blobs.addCheckpoint(model.currentCheckpoint(), bytes);
  return { model, blobs };
}

const added: ExportStage[] = [];
const addStage = (s: ExportStage) => {
  EXPORT_STAGES.push(s);
  added.push(s);
};
afterEach(() => {
  for (const s of added.splice(0))
    EXPORT_STAGES.splice(EXPORT_STAGES.indexOf(s), 1);
});
beforeAll(() => registerCoreOperations());

describe('exportDocument', () => {
  it('refuses a restricted document (no permission bypass)', async () => {
    const bytes = await makeTextPdf({ pages: 2, label: 'Alpha' });
    const model = makeModel(makeState(2, { restricted: true }));
    const blobs = new BlobStore(null, 'doc1');
    blobs.addCheckpoint(model.currentCheckpoint(), bytes);
    await expect(
      exportDocument(model, blobs, options(), env()),
    ).rejects.toThrow(/owner password/);
  });

  it('writes the edited document', async () => {
    const { model, blobs } = await setup();
    model.dispatch({ type: 'page.delete', params: { pageIds: ['ckpt0:1'] } });
    model.dispatch({
      type: 'page.rotate',
      params: { pageIds: ['ckpt0:2'], delta: 90 },
    });
    const out = await exportDocument(model, blobs, options(), env());
    expect(await pdfPageTexts(out.bytes)).toEqual(['Alpha 1', 'Alpha 3']);
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([0, 90]);
  });

  it('exports only the chosen pages', async () => {
    const { model, blobs } = await setup();
    const out = await exportDocument(
      model,
      blobs,
      options({ onlyPages: ['ckpt0:2'] }),
      env(),
    );
    expect(await pdfPageTexts(out.bytes)).toEqual(['Alpha 3']);
  });

  it('runs applicable stages in order', async () => {
    const { model, blobs } = await setup();
    const seen: string[] = [];
    const stage = (
      id: string,
      order: number,
      applies: boolean,
    ): ExportStage => ({
      id,
      order,
      applies: () => applies,
      run: async (b, ctx) => {
        seen.push(id);
        ctx.warnings.push(`${id} ran`);
        return b;
      },
    });
    addStage(stage('late', 50, true));
    addStage(stage('skipped', 40, false));
    addStage(stage('early', 1, true));
    const out = await exportDocument(model, blobs, options(), env());
    expect(seen).toEqual(['early', 'late']);
    expect(out.warnings).toEqual(['early ran', 'late ran']);
  });

  it('removes document properties when asked', async () => {
    const { model, blobs } = await setup(await makeMetadataPdf());
    const out = await exportDocument(
      model,
      blobs,
      options({ stripMetadata: true }),
      env(),
    );
    const doc = await PDFDocument.load(out.bytes, { updateMetadata: false });
    expect(doc.getTitle()).toBeUndefined();
  });

  it('a cancelled export rejects and returns nothing', async () => {
    const { model, blobs } = await setup();
    const ctrl = new AbortController();
    addStage({
      id: 'cancel',
      order: 1,
      applies: () => true,
      run: async (b) => {
        ctrl.abort();
        return b;
      },
    });
    await expect(
      exportDocument(model, blobs, options(), env(ctrl.signal)),
    ).rejects.toMatchObject({ code: 'CANCELLED' });
  });
});
