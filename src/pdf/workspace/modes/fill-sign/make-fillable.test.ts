import { describe, expect, it, vi } from 'vitest';
import type { ModeProps } from '../types';
import { makeFillable } from './actions';
import type { ViewField } from './fields';

const field = (key: string, fillOpId: string | null): ViewField =>
  ({
    key,
    page: { id: 'p1' },
    pageNumber: 1,
    rect: { x: 0, y: 0, width: 100, height: 20 },
    type: 'text',
    label: key,
    autofill: null,
    status: 'field',
    origin: 'detected',
    value: fillOpId ? 'x' : '',
    filled: !!fillOpId,
    fillOpId,
  }) as ViewField;

describe('makeFillable', () => {
  it('is one undo step: the filled values are left out of the checkpoint input', async () => {
    const dispatch = vi.fn(() => []);
    const runCheckpoint = vi.fn(async () => ({ title: 'ok' }));
    const ctx = {
      doc: { dispatch, runCheckpoint, undo: vi.fn() },
    } as unknown as ModeProps;
    await makeFillable(ctx, [field('a', 'op1'), field('b', null)]);
    expect(dispatch).not.toHaveBeenCalled();
    expect(runCheckpoint).toHaveBeenCalledWith(
      'flat.makeFillable',
      { fields: expect.any(Array) },
      expect.objectContaining({ exclude: ['op1'] }),
    );
  });
});
