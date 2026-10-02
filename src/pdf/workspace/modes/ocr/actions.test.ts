import { describe, expect, it } from 'vitest';
import { ocrReport } from '@/pdf/doc/checkpoints/ocr';
import type { DocumentState } from '@/pdf/doc/model';
import type { DocView, PageId } from '@/pdf/doc/types';
import { checkCached, latestOcr, ocrParams } from './actions';

const view = {
  pages: [
    { id: 'a', blank: false },
    { id: 'b', blank: true },
    { id: 'c', blank: false },
  ],
} as unknown as DocView;

describe('ocrParams', () => {
  it('passes auto and force through, the current page first', () => {
    expect(
      ocrParams({ langs: ['eng'], pages: 'auto' }, view, new Set(), 'c'),
    ).toEqual({ langs: ['eng'], pages: 'auto', first: ['c'] });
    expect(
      ocrParams(
        { langs: ['eng', 'fra'], pages: 'force' },
        view,
        new Set(),
        null,
      ),
    ).toEqual({ langs: ['eng', 'fra'], pages: 'force' });
  });

  it('turns the selection into page ids in document order, skipping blanks', () => {
    const sel = new Set<PageId>(['c', 'b', 'a'] as PageId[]);
    expect(
      ocrParams({ langs: ['eng'], pages: 'selected' }, view, sel, null).pages,
    ).toEqual(['a', 'c']);
  });

  it('refuses an empty selection', () => {
    expect(() =>
      ocrParams({ langs: ['eng'], pages: 'selected' }, view, new Set(), null),
    ).toThrow('Select the pages to run OCR on');
  });
});

describe('checkCached', () => {
  it('is true only when every language is stored', async () => {
    const stored = new Set(['eng']);
    const has = async (l: string) => stored.has(l);
    expect(await checkCached(['eng'], has)).toBe(true);
    expect(await checkCached(['eng', 'fra'], has)).toBe(false);
  });

  it('counts a storage failure as not stored', async () => {
    expect(
      await checkCached(['eng'], async () => {
        throw new Error('blocked');
      }),
    ).toBe(false);
  });
});

describe('latestOcr', () => {
  const report = ocrReport([
    {
      page: 2,
      words: 4,
      meanConfidence: 40,
      low: true,
      dpi: 300,
      capped: false,
      skippedChars: 0,
    },
  ]);
  const state = (cursor: number) =>
    ({
      cursor,
      log: [
        { id: 'o1', type: 'ocr.textLayer', checkpoint: 'k1' },
        { id: 'o2', type: 'organize.rotate' },
      ],
      checkpoints: [{ id: 'k1', sourceId: 's1', report }],
    }) as unknown as DocumentState;

  it('finds the run before the cursor with its pages', () => {
    const l = latestOcr(state(2));
    expect(l?.sourceId).toBe('s1');
    expect(l?.pages).toEqual([expect.objectContaining({ page: 2, low: true })]);
  });

  it('is null once the run is undone', () => {
    expect(latestOcr(state(0))).toBeNull();
  });
});
