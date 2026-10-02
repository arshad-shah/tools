import { describe, expect, it } from 'vitest';
import type { DetectedField } from '@/pdf/detect';
import { combCells } from './actions';

const comb: DetectedField = {
  id: '1:comb:196:700',
  pageIndex: 1,
  rect: { x: 196, y: 700, width: 336, height: 15 },
  type: 'text',
  label: 'Surname',
  autofill: 'surname',
  confidence: 0.9,
  status: 'field',
  source: 'comb',
  cellCount: 24,
};

describe('combCells', () => {
  it('keeps the cell pitch when a comb field is split or merged', () => {
    expect(combCells(comb, { ...comb.rect, width: 168 })).toEqual({
      cellCount: 12,
    });
    expect(combCells(comb, { ...comb.rect, width: 504 })).toEqual({
      cellCount: 36,
    });
  });

  it('leaves plain fields alone', () => {
    const plain = { ...comb, cellCount: undefined };
    expect(combCells(plain, comb.rect)).toEqual({});
  });
});
