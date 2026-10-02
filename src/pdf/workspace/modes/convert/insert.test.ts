import { describe, expect, it, vi } from 'vitest';
import type { Operation } from '@/pdf/doc/types';
import { dispatchWithSource } from './insert';

const input = {
  type: 'page.insertImages',
  params: { at: 0, sourceId: 's1', newIds: ['n0'] },
};

describe('dispatchWithSource', () => {
  it('keeps the source when the insert lands', () => {
    const op = { id: 'o1' } as Operation;
    const doc = { dispatch: vi.fn(() => [op]), removeSource: vi.fn() };
    expect(dispatchWithSource(doc, 's1', input)).toEqual([op]);
    expect(doc.removeSource).not.toHaveBeenCalled();
  });

  it('removes the source when the insert is refused', () => {
    const doc = { dispatch: vi.fn(() => []), removeSource: vi.fn() };
    expect(dispatchWithSource(doc, 's1', input)).toEqual([]);
    expect(doc.removeSource).toHaveBeenCalledWith('s1');
  });

  it('removes the source when the insert throws', () => {
    const doc = {
      dispatch: vi.fn(() => {
        throw new Error('no');
      }),
      removeSource: vi.fn(),
    };
    expect(() => dispatchWithSource(doc, 's1', input)).toThrow('no');
    expect(doc.removeSource).toHaveBeenCalledWith('s1');
  });
});
