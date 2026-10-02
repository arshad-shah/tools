/** @vitest-environment jsdom */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { asDetectionCache, mergeDetection } from '@/pdf/doc/detection';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { makeModel } from '@/pdf/doc/test-helpers';
import type { DocumentApi } from '../types';
import { pageCells, useDetection } from './data';
import { fillSign } from './store';

beforeAll(() => registerCoreOperations());
beforeEach(() => fillSign.reset());

const CELL = { x: 10, y: 20, width: 100, height: 22 };

describe('table cells in the detection cache', () => {
  it('stores the cells with the page detection', async () => {
    const model = makeModel();
    const setDetection = vi.fn((d: unknown) => model.setDetection(d));
    const doc = {
      view: model.getView(),
      state: model.getState(),
      sources: { s0: { docId: 'r1', info: null } },
      currentPage: 'ckpt0:0',
      render: {
        detect: vi.fn(async () => ({
          pageIndex: 0,
          fields: [],
          skipped: null,
          ms: 1,
          cells: [CELL],
        })),
      },
      setDetection,
    } as unknown as DocumentApi;
    renderHook(() => useDetection(doc, true));
    await waitFor(() => expect(setDetection).toHaveBeenCalled());
    const cache = asDetectionCache(model.getState().detection)!;
    expect(cache.pages['s0:0'].cells).toEqual([CELL]);
  });

  it('reads a restored page cells from the cache, else the session store', () => {
    const cache = mergeDetection(undefined, 's0', {
      pageIndex: 0,
      fields: [],
      skipped: null,
      ms: 1,
      cells: [CELL],
    });
    expect(pageCells(cache, 's0:0', {})).toEqual([CELL]);
    const old = mergeDetection(undefined, 's0', {
      pageIndex: 0,
      fields: [],
      skipped: null,
      ms: 1,
    });
    expect(pageCells(old, 's0:0', { 's0:0': [CELL] })).toEqual([CELL]);
    expect(pageCells(old, 's0:0', {})).toBeNull();
  });
});
