import { describe, expect, it } from 'vitest';
import { placeFloating, type Rect } from './position';

const viewport: Rect = { x: 0, y: 0, width: 1000, height: 800 };
const box = { width: 200, height: 100 };
const opts = {
  side: 'bottom' as const,
  align: 'start' as const,
  offset: 8,
  padding: 8,
};

describe('placeFloating', () => {
  it('places below the anchor when it fits', () => {
    const anchor = { x: 100, y: 100, width: 80, height: 30 };
    expect(placeFloating(anchor, box, viewport, opts)).toEqual({
      x: 100,
      y: 138,
      side: 'bottom',
    });
  });

  it('flips to the top when the bottom overflows and the top has room', () => {
    const anchor = { x: 100, y: 700, width: 80, height: 30 };
    // bottom would end at 838, 50px past 800 - 8.
    expect(placeFloating(anchor, box, viewport, opts)).toEqual({
      x: 100,
      y: 592,
      side: 'top',
    });
  });

  it('stays on the preferred side when the opposite is worse', () => {
    const anchor = { x: 100, y: 50, width: 80, height: 650 };
    const r = placeFloating(anchor, box, viewport, opts);
    expect(r.side).toBe('bottom');
  });

  it('shifts left at the right edge, never past the padding', () => {
    const anchor = { x: 950, y: 100, width: 40, height: 30 };
    expect(placeFloating(anchor, box, viewport, opts).x).toBe(1000 - 8 - 200);
    const wide = { width: 1200, height: 100 };
    expect(placeFloating(anchor, wide, viewport, opts).x).toBe(8);
  });

  it('align end lines up the right edges', () => {
    const anchor = { x: 300, y: 100, width: 80, height: 30 };
    expect(
      placeFloating(anchor, box, viewport, { ...opts, align: 'end' }).x,
    ).toBe(180);
  });

  it('align center centres on the anchor', () => {
    const anchor = { x: 300, y: 100, width: 100, height: 30 };
    expect(
      placeFloating(anchor, box, viewport, { ...opts, align: 'center' }).x,
    ).toBe(250);
  });

  it('left and right sides are symmetric', () => {
    const anchor = { x: 400, y: 300, width: 50, height: 40 };
    expect(
      placeFloating(anchor, box, viewport, { ...opts, side: 'right' }),
    ).toEqual({
      x: 458,
      y: 300,
      side: 'right',
    });
    expect(
      placeFloating(anchor, box, viewport, { ...opts, side: 'left' }),
    ).toEqual({
      x: 192,
      y: 300,
      side: 'left',
    });
    const nearLeft = { x: 50, y: 300, width: 50, height: 40 };
    expect(
      placeFloating(nearLeft, box, viewport, { ...opts, side: 'left' }).side,
    ).toBe('right');
  });
});
