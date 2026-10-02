import { beforeAll, describe, expect, it } from 'vitest';
import { optimize, run } from '@arshad-shah/qpdf-wasm';
import { PDFDocument } from 'pdf-lib';
import { makeTextPdf } from '../../../../test/fixtures/builders';
import { BlobStore } from '../blob-store';
import { exportDocument } from '../export';
import { EXPORT_STAGES } from '../export-stages';
import { registerCoreOperations } from '../ops';
import { makeModel, makeState } from '../test-helpers';
import { inProcessServices } from '../test-services';
import { linearizeStage } from './linearize';

beforeAll(() => registerCoreOperations());

/** qpdf --check-linearization on the output. */
async function isLinearized(bytes: Uint8Array): Promise<boolean> {
  const r = await run(['--check-linearization', 'in.pdf'], {
    'in.pdf': bytes,
  });
  return r.exitCode === 0 && /no linearization errors/.test(r.stdout);
}

async function exportWith(linearize: boolean | undefined) {
  const bytes = await makeTextPdf({ pages: 3 });
  const model = makeModel(makeState(3));
  const blobs = new BlobStore(null, 'doc1');
  blobs.addCheckpoint(model.currentCheckpoint(), bytes);
  return exportDocument(
    model,
    blobs,
    {
      filename: 'a.pdf',
      onlyPages: null,
      stripMetadata: false,
      ...(linearize === undefined ? {} : { linearize }),
    },
    {
      services: inProcessServices({
        qpdf: {
          optimize: async (
            b: Uint8Array,
            o: Parameters<typeof optimize>[1],
          ) => {
            const r = await optimize(b, o);
            return { bytes: r.bytes, warnings: r.warnings };
          },
        } as never,
      }),
      signal: new AbortController().signal,
      progress: () => {},
    },
  );
}

describe('linearize export stage', () => {
  it('is registered after the unreferenced-object sweep', () => {
    expect(EXPORT_STAGES).toContain(linearizeStage);
    expect(linearizeStage.order).toBe(20);
  });

  it('writes a linearized file when "Optimise for fast web view" is on', async () => {
    const out = await exportWith(true);
    expect(await isLinearized(out.bytes)).toBe(true);
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(3);
  });

  it('leaves the file alone when the option is off', async () => {
    expect(await isLinearized((await exportWith(false)).bytes)).toBe(false);
    expect(await isLinearized((await exportWith(undefined)).bytes)).toBe(false);
  });
});
