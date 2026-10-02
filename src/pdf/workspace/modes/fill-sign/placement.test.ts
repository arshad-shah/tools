import { describe, expect, it } from 'vitest';
import type { SignTarget } from '@/pdf/detect';
import { nearestTarget, snapToTarget } from './placement';

const line: SignTarget = {
  id: 'a',
  pageIndex: 0,
  kind: 'signature',
  rect: { x: 72, y: 585, width: 228, height: 11 },
  label: 'Signature of applicant',
  source: 'line',
};

describe('snapToTarget', () => {
  it('sits the baseline on the line, left aligned with 4pt padding', () => {
    const b = snapToTarget({ aspect: 4 }, line, 30);
    expect(b.height).toBeCloseTo(27);
    expect(b.width).toBeCloseTo(108);
    expect(b.x).toBe(76);
    // 15% of the height hangs below the line for descenders.
    expect(b.y).toBeCloseTo(585 - 0.15 * 27);
  });

  it('clamps the height to 18..48pt and the width to the line', () => {
    expect(snapToTarget({ aspect: 4 }, line, 10).height).toBe(18);
    expect(snapToTarget({ aspect: 4 }, line, 100).height).toBe(48);
    const wide = snapToTarget({ aspect: 10 }, line, 40);
    expect(wide.width).toBe(224);
    expect(wide.height).toBeCloseTo(22.4);
    expect(wide.y).toBeCloseTo(585 - 0.15 * 22.4);
  });

  it('fits inside a cell with a 2pt inset and fills a /Sig field exactly', () => {
    const cell: SignTarget = {
      ...line,
      source: 'cell',
      rect: { x: 216, y: 600, width: 340, height: 40 },
    };
    expect(snapToTarget({ aspect: 3 }, cell, 40)).toEqual({
      x: 216 + (340 - 108) / 2,
      y: 602,
      width: 108,
      height: 36,
    });
    const field: SignTarget = {
      ...line,
      source: 'sig-field',
      rect: { x: 320, y: 120, width: 200, height: 50 },
    };
    expect(snapToTarget({ aspect: 3 }, field, 40)).toEqual(field.rect);
  });
});

describe('nearestTarget', () => {
  const cell: SignTarget = {
    ...line,
    id: 'b',
    source: 'cell',
    rect: { x: 300, y: 400, width: 100, height: 40 },
  };
  const other: SignTarget = { ...line, id: 'c', pageIndex: 1 };

  it('takes the closest target on the page within 12pt', () => {
    const all = [line, cell, other];
    expect(nearestTarget(all, [100, 580], 0)?.id).toBe('a');
    expect(nearestTarget(all, [350, 420], 0)?.id).toBe('b');
    expect(nearestTarget(all, [100, 580], 1)?.id).toBe('c');
    expect(nearestTarget(all, [100, 560], 0)).toBeNull();
    expect(nearestTarget(all, [100, 560], 0, 30)?.id).toBe('a');
  });
});
