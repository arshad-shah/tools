import { describe, expect, it } from 'vitest';
import type { DetectedField } from '@/pdf/detect';
import { combCells, styleParams } from './actions';

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

describe('comb cell positions', () => {
  const date: DetectedField = {
    ...comb,
    type: 'date',
    cellCount: 4,
    rect: { ...comb.rect, width: 80 },
    cellCentres: [0.1, 0.3, 0.6, 0.9],
  };

  it('keep the detected positions only while the cell count holds', () => {
    expect(combCells(date, { ...date.rect, x: 10 }).cellCentres).toEqual(
      date.cellCentres,
    );
    expect(
      combCells(date, { ...date.rect, width: 40 }).cellCentres,
    ).toBeUndefined();
  });

  it('go into a fill only with their own cell count', () => {
    const cells = [0.1, 0.3, 0.6, 0.9];
    const style = { size: 10, color: '#000000', spacing: 0, comb: 4, cells };
    expect(styleParams(style).cells).toEqual(cells);
    expect(styleParams({ ...style, comb: 6 }).cells).toBeUndefined();
  });
});
