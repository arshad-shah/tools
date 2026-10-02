import { ToolError } from '@/shared/lib/errors';
import { plural } from '../ops/validate';
import type { MakeFillableField } from '../ops/fill-sign';
import { defineCheckpointRunner, type CheckpointRunner } from './registry';

/** form.flatten: AcroForm fields become page content (edit worker). */
export const flattenRunner = defineCheckpointRunner<Record<string, never>>({
  type: 'form.flatten',
  async run({ bytes }, { services, signal }) {
    const out = await services.edit.call('flattenForm', [bytes], { signal });
    return {
      bytes: out.bytes,
      report: {
        title: 'Form flattened',
        lines: [
          `${out.fields} form ${plural(out.fields, 'field')} turned into page content`,
        ],
        warnings: [],
      },
    };
  },
});

/** flat.makeFillable: accepted flat fields become AcroForm widgets. */
export const makeFillableRunner = defineCheckpointRunner<{
  fields: MakeFillableField[];
}>({
  type: 'flat.makeFillable',
  async run({ bytes, params, view }, { services, signal }) {
    // The materialised bytes hold the view's pages in order.
    const index = new Map(view.pages.map((p, i) => [p.id, i]));
    const fields = params.fields.map((f) => {
      const pageIndex = index.get(f.pageId);
      if (pageIndex === undefined)
        throw new ToolError('INVALID_INPUT', 'Page no longer exists');
      return {
        pageIndex,
        rect: f.rect,
        type: f.type,
        label: f.label,
        ...(f.value !== undefined ? { value: f.value } : {}),
      };
    });
    const out = await services.edit.call('createFields', [bytes, fields], {
      signal,
    });
    const n = out.names.length;
    return {
      bytes: out.bytes,
      report: {
        title: `${n} ${plural(n, 'field')} made fillable`,
        lines: [`Field names: ${out.names.join(', ')}`],
        warnings: [],
      },
    };
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FILL_SIGN_RUNNERS: readonly CheckpointRunner<any>[] = [
  flattenRunner,
  makeFillableRunner,
];
