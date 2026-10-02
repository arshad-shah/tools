import { beforeAll, describe, expect, it } from 'vitest';
import {
  makeTextPdf,
  pdfPageTexts,
} from '../../../../../test/fixtures/builders';
import { BlobStore } from '@/pdf/doc/blob-store';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { inProcessServices } from '@/pdf/doc/test-services';
import { makeModel, makeState } from '@/pdf/doc/test-helpers';
import { extractPages, splitDocument, splitGroups } from './split-extract';

const services = inProcessServices();
async function setup(pages: number) {
  const model = makeModel(makeState(pages));
  const blobs = new BlobStore(null, 'doc1');
  blobs.addCheckpoint(
    model.currentCheckpoint(),
    await makeTextPdf({ pages, label: 'Alpha' }),
  );
  return { model, blobs };
}

beforeAll(() => registerCoreOperations());

describe('extract and split', () => {
  it('extracts pages 1 and 3', async () => {
    const { model, blobs } = await setup(3);
    const bytes = await extractPages(model, blobs, ['ckpt0:0', 'ckpt0:2'], {
      services,
    });
    expect(await pdfPageTexts(bytes)).toEqual(['Alpha 1', 'Alpha 3']);
  });

  it('splits a 5-page document every 2 pages into 2, 2 and 1', async () => {
    const { model, blobs } = await setup(5);
    const parts = await splitDocument(model, blobs, { every: 2 }, new Set(), {
      services,
    });
    expect(parts.map((p) => p.name)).toEqual([
      'a.part-1.pdf',
      'a.part-2.pdf',
      'a.part-3.pdf',
    ]);
    expect(await Promise.all(parts.map((p) => pdfPageTexts(p.bytes)))).toEqual([
      ['Alpha 1', 'Alpha 2'],
      ['Alpha 3', 'Alpha 4'],
      ['Alpha 5'],
    ]);
  });

  it('cuts before each selected page', () => {
    expect(
      splitGroups(['a', 'b', 'c', 'd'], 'selected', new Set(['a', 'c'])),
    ).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(() => splitGroups(['a', 'b'], 'selected', new Set())).toThrow(
      'Select the pages where each new part should start',
    );
    expect(() => splitGroups(['a'], { every: 0 })).toThrow();
  });

  it('refuses to extract or split a restricted document', async () => {
    const model = makeModel(makeState(4, { restricted: true }));
    const blobs = new BlobStore(null, 'doc1');
    blobs.addCheckpoint(
      model.currentCheckpoint(),
      await makeTextPdf({ pages: 4, label: 'Alpha' }),
    );
    await expect(
      extractPages(model, blobs, ['ckpt0:0'], { services }),
    ).rejects.toThrow(/owner password/);
    await expect(
      splitDocument(model, blobs, { every: 2 }, new Set(), { services }),
    ).rejects.toThrow(/owner password/);
  });
});
