import { describe, expect, it } from 'vitest';
import { emptyMask, ringMask } from '@/pdf/sign/photo/test-images';
import { traceMask } from './trace';

describe('traceMask', () => {
  it('returns path data in mask pixels with one subpath per contour', () => {
    const v = traceMask(ringMask(48, 40, 18, 8));
    expect(v.width).toBe(48);
    expect(v.height).toBe(40);
    expect(v.d.match(/M/g)).toHaveLength(2);
    expect(v.d.match(/Z/g)).toHaveLength(2);
    expect(v.d).toMatch(/^M[-\d. ]+C/);
    expect(v.d).not.toContain('NaN');
  });

  it('traces a square with straight segments through its corners', () => {
    const m = emptyMask(14, 14);
    for (let y = 2; y < 12; y++)
      for (let x = 2; x < 12; x++) m.data[y * 14 + x] = 1;
    const { d } = traceMask(m);
    expect(d.match(/C/g)).toHaveLength(4);
    expect(d).toContain('M2 2');
  });

  it('drops contours smaller than minArea', () => {
    const m = emptyMask(20, 20);
    for (let y = 2; y < 5; y++)
      for (let x = 2; x < 5; x++) m.data[y * 20 + x] = 1;
    expect(traceMask(m).d).toBe('');
    expect(traceMask(m, { minArea: 4 }).d).not.toBe('');
  });
});
