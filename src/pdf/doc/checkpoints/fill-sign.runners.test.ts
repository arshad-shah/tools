import { beforeAll, describe, expect, it } from 'vitest';
import type { RpcClient } from '@/shared/lib/worker-rpc';
import { listFormFields } from '@/pdf/edit/forms';
import type { EditHandlers } from '@/pdf/edit/worker/handlers';
import { formHandlers } from '@/pdf/edit/worker/forms';
import { makeFormPdf, makeTextPdf } from '../../../../test/fixtures/builders';
import { inProcessServices } from '../test-services';
import { makeModel } from '../test-helpers';
import { registerCoreOperations } from '../ops';
import { flattenRunner, makeFillableRunner } from './fill-sign';

beforeAll(() => registerCoreOperations());

const ctx = { signal: new AbortController().signal, progress: () => {} };
const services = inProcessServices({
  edit: {
    async call(method: keyof typeof formHandlers, args: unknown[]) {
      const fn = formHandlers[method] as (...a: unknown[]) => Promise<{
        value: unknown;
      }>;
      return (await fn(ctx, ...args)).value;
    },
  } as unknown as RpcClient<EditHandlers>,
});
const env = { services, signal: ctx.signal, progress: () => {} };

describe('fill-sign checkpoint runners', () => {
  it('make fillable maps page ids to the materialised page order', async () => {
    const model = makeModel();
    model.dispatch({
      type: 'page.reorder',
      params: { pageIds: ['ckpt0:2'], to: 0 },
    });
    const bytes = await makeTextPdf({ pages: 3 });
    const out = await makeFillableRunner.run(
      {
        bytes,
        params: {
          fields: [
            {
              pageId: 'ckpt0:2',
              rect: { x: 10, y: 10, width: 100, height: 20 },
              type: 'text',
              label: 'Surname',
              value: 'Doe',
            },
          ],
        },
        assets: {},
        view: model.getView(),
      },
      env,
    );
    expect(out.report.title).toBe('1 field made fillable');
    const [field] = await listFormFields(out.bytes);
    expect(field).toMatchObject({ name: 'surname', value: 'Doe' });
  });

  it('flatten reports how many fields became content', async () => {
    const out = await flattenRunner.run(
      {
        bytes: await makeFormPdf(),
        params: {},
        assets: {},
        view: makeModel().getView(),
      },
      env,
    );
    expect(out.report).toMatchObject({
      title: 'Form flattened',
      lines: ['8 form fields turned into page content'],
    });
  });
});
