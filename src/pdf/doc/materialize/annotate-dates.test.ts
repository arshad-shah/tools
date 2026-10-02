import { beforeAll, describe, expect, it } from 'vitest';
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { makeTextPdf } from '../../../../test/fixtures/builders';
import { pdfDate } from '../../edit/annot/common';
import { BlobStore } from '../blob-store';
import { DocumentModel } from '../model';
import { registerCoreOperations } from '../ops';
import { planFor } from '../plan';
import { makeCheckpoint, makeState } from '../test-helpers';
import { ALL_MATERIALIZERS } from '.';
import { materialize } from './materialize';
import { registerMaterializers } from './registry';

beforeAll(() => {
  registerCoreOperations();
  registerMaterializers(ALL_MATERIALIZERS);
});

const rpc = () => ({
  signal: new AbortController().signal,
  progress: () => {},
});

describe('annotation dates', () => {
  it('are the time the annotation was made, not the export time', async () => {
    const made = new Date(2024, 4, 6, 7, 8, 9).getTime();
    const model = new DocumentModel(makeState(1), { now: () => made });
    model.dispatch({
      type: 'annot.markup',
      params: {
        id: 'a1',
        pageId: 'ckpt0:0',
        subtype: 'Highlight',
        quads: [[72, 720, 200, 720, 72, 700, 200, 700]],
        opacity: 1,
        contents: '',
        author: 'Me',
        color: '#ffd400',
      },
    });
    const blobs = new BlobStore(null, 'doc1');
    blobs.addCheckpoint(
      makeCheckpoint('ckpt0', 's0'),
      await makeTextPdf({ pages: 1 }),
    );
    const out = await materialize(await planFor(model, blobs), rpc());
    const page = (await PDFDocument.load(out.bytes)).getPage(0);
    const annots = page.node.lookup(PDFName.of('Annots'), PDFArray);
    const dict = annots.lookup(0, PDFDict);
    const date = (k: string) =>
      dict.lookup(PDFName.of(k), PDFString).asString();
    expect(date('CreationDate')).toBe(pdfDate(new Date(made)));
    expect(date('M')).toBe(pdfDate(new Date(made)));
  });
});
