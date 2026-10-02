import { describe, expect, it, vi } from 'vitest';
import type { PageRef } from '@/pdf/doc/types';
import { pageFieldValues, type FormInfoCache } from './field-values';

const widget = (patch: Record<string, unknown>) => ({
  fieldName: 'f',
  kind: 'text',
  pageIndex: 0,
  rect: { x: 1, y: 2, width: 3, height: 4 },
  readOnly: false,
  value: '',
  label: null,
  ...patch,
});

const docWith = (widgets: unknown[], fail = false) => {
  const formInfo = vi.fn(() =>
    fail
      ? Promise.reject(new Error('no'))
      : Promise.resolve({ hasAcroForm: true, hasXfa: false, widgets }),
  );
  return {
    doc: {
      sources: { s0: { docId: 'd0' } },
      render: { formInfo },
    } as never,
    formInfo,
  };
};

const page = (index: number) => ({ id: 'p', source: 's0', index }) as PageRef;

describe('pageFieldValues', () => {
  it("lists the page's text and choice values, once per file", async () => {
    const { doc, formInfo } = docWith([
      widget({ fieldName: 'account', value: 'ACC-1' }),
      widget({ fieldName: 'opts', value: ['a', 'b'], label: 'Options' }),
      widget({ fieldName: 'tick', kind: 'checkbox', value: true }),
      widget({ fieldName: 'other', value: 'x', pageIndex: 1 }),
      widget({ fieldName: 'empty', value: '' }),
    ]);
    const cache: FormInfoCache = new Map();
    const p0 = await pageFieldValues(doc, page(0), cache);
    expect(p0.map((f) => [f.name, f.value])).toEqual([
      ['account', 'ACC-1'],
      ['Options', 'a b'],
    ]);
    expect(await pageFieldValues(doc, page(1), cache)).toHaveLength(1);
    expect(formInfo).toHaveBeenCalledTimes(1);
  });

  it('gives no fields when the form cannot be read', async () => {
    const { doc } = docWith([], true);
    expect(await pageFieldValues(doc, page(0), new Map())).toEqual([]);
  });
});
