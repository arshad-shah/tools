import { beforeAll, describe, expect, it } from 'vitest';
import { makeImageHeavyPdf } from '../../../../../test/fixtures/builders';
import { BlobStore } from '@/pdf/doc/blob-store';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { makeModel, makeState } from '@/pdf/doc/test-helpers';
import { inProcessServices } from '@/pdf/doc/test-services';
import { sizeBreakdown } from '@/pdf/edit/size-breakdown';
import type { Services } from '@/pdf/doc/services';
import { documentBreakdown } from './breakdown';

beforeAll(() => registerCoreOperations());

/** Materialise in-process; answer sizeBreakdown like the edit worker does. */
function services(): Services {
  const base = inProcessServices();
  const edit = {
    ...base.edit,
    call: (method: string, args: unknown[], opts: object) =>
      method === 'sizeBreakdown'
        ? sizeBreakdown(args[0] as Uint8Array)
        : base.edit.call(method as never, args as never, opts),
  };
  return { ...base, edit: edit as unknown as Services['edit'] };
}

describe('documentBreakdown', () => {
  it('breaks down the document as it is now, pending changes included', async () => {
    const bytes = await makeImageHeavyPdf();
    const model = makeModel(makeState(4));
    const blobs = new BlobStore(null, 'doc1');
    blobs.addCheckpoint(model.currentCheckpoint(), bytes);
    const whole = await documentBreakdown(
      { model, blobs, services: services() },
      new AbortController().signal,
    );
    expect(whole.images / whole.total).toBeGreaterThan(0.8);
    model.dispatch({
      type: 'page.delete',
      params: { pageIds: ['ckpt0:0', 'ckpt0:1', 'ckpt0:2'] },
    });
    const after = await documentBreakdown(
      { model, blobs, services: services() },
      new AbortController().signal,
    );
    expect(after.images).toBeLessThan(whole.images);
    expect(after.images + after.fonts + after.content + after.other).toBe(
      after.total,
    );
  });
});
