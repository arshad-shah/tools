import { inferModel } from '../infer';
import type { TypeModel } from '../model';
import { DEFAULT_EMIT, type EmitOptions } from './shared';

/** Test fixtures shared by the emitter tests. */
export const ORDER = {
  id: 7,
  'first-name': 'Ada',
  total: 12.5,
  paid: true,
  created: '2024-01-02T03:04:05Z',
  tags: [],
  note: null,
  shipping: { street: 'High St', zip: null },
  items: [
    { sku: 'a', qty: 1 },
    { sku: 'b', qty: null, gift: true },
  ],
};

export const model = (samples: unknown[], rootName = 'Order'): TypeModel =>
  inferModel(samples, { rootName, detectDates: true });

export const orderModel = () => model([ORDER]);

export const emitOpts = (patch: Partial<EmitOptions> = {}): EmitOptions => ({
  ...DEFAULT_EMIT,
  ...patch,
});
