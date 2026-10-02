import { describe, expect, it } from 'vitest';
import type { PageDetection } from '@/pdf/detect';
import { fromRecords, toRecords } from './serialize';
import { makeModel } from './test-helpers';
import { asDetectionCache, detectionKey, mergeDetection } from './detection';

const page = (pageIndex: number): PageDetection => ({
  pageIndex,
  fields: [],
  skipped: null,
  ms: 3,
});

describe('detection cache', () => {
  it('merging keeps the other pages', () => {
    const a = mergeDetection(undefined, 's0', page(0));
    const b = mergeDetection(a, 's0', page(1));
    expect(Object.keys(b.pages)).toEqual([
      detectionKey('s0', 0),
      detectionKey('s0', 1),
    ]);
    expect(
      mergeDetection(b, 's0', { ...page(0), ms: 9 }).pages['s0:0'].ms,
    ).toBe(9);
  });

  it('is kept with the document, outside undo, and restored', () => {
    const model = makeModel();
    const events: string[] = [];
    model.subscribe((e) => events.push(e.kind));
    model.setDetection(mergeDetection(undefined, 's0', page(2)));
    expect(events).toEqual(['changed']);
    expect(model.canUndo()).toBe(false);
    const { doc, log } = toRecords(model.getState(), {
      mode: 'fill-sign',
      viewport: { page: 0, zoom: { kind: 'fit-width' } },
    });
    const restored = fromRecords({ ...doc, thumb: null, updatedAt: 0 }, log);
    expect(asDetectionCache(restored.detection)?.pages['s0:2']).toEqual(
      page(2),
    );
  });

  it('ignores anything that is not a cache', () => {
    expect(asDetectionCache(undefined)).toBeUndefined();
    expect(asDetectionCache({ nope: 1 })).toBeUndefined();
  });
});
