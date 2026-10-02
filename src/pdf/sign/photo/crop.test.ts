import { describe, expect, it } from 'vitest';
import { cropMask, inkBounds } from './crop';
import { emptyMask } from './test-images';

describe('inkBounds', () => {
  const m = emptyMask(200, 100);
  for (let y = 20; y < 40; y++)
    for (let x = 50; x < 150; x++) m.data[y * 200 + x] = 1;

  it('adds a 4% margin of the longer side by default', () => {
    expect(inkBounds(m)).toEqual({ x: 46, y: 16, width: 108, height: 28 });
  });
  it('honours a custom margin and returns null without ink', () => {
    expect(inkBounds(m, 0)).toEqual({ x: 50, y: 20, width: 100, height: 20 });
    expect(inkBounds(emptyMask(10, 10))).toBeNull();
  });
});

describe('cropMask', () => {
  it('copies the rectangle and pads outside the source with background', () => {
    const m = emptyMask(4, 4);
    m.data[0] = 1;
    m.data[5] = 1;
    const c = cropMask(m, { x: -1, y: -1, width: 3, height: 3 });
    expect(c.width).toBe(3);
    expect(Array.from(c.data)).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 1]);
  });
});
