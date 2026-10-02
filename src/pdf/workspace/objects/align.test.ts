import { describe, expect, it } from 'vitest';
import { alignBoxes, distributeBoxes } from './align';

const b = (x: number, y: number, width: number, height: number) => ({
  x,
  y,
  width,
  height,
});
const boxes = [b(10, 100, 20, 10), b(50, 200, 40, 30), b(30, 150, 10, 20)];

describe('alignBoxes', () => {
  it.each([
    ['left', [10, 10, 10], 'x'],
    ['right', [70, 50, 80], 'x'],
    ['center', [40, 30, 45], 'x'],
    ['bottom', [100, 100, 100], 'y'],
    ['top', [220, 200, 210], 'y'],
    ['middle', [160, 150, 155], 'y'],
  ] as const)('%s', (how, expected, key) => {
    const out = alignBoxes(boxes, how);
    expect(out.map((o) => o[key])).toEqual(expected);
    expect(out.map((o) => [o.width, o.height])).toEqual(
      boxes.map((o) => [o.width, o.height]),
    );
  });
  it('leaves a single box alone', () => {
    expect(alignBoxes([boxes[0]], 'left')).toEqual([boxes[0]]);
  });
});

describe('distributeBoxes', () => {
  it('spaces boxes with equal gaps, outermost fixed', () => {
    const out = distributeBoxes(
      [b(0, 0, 10, 10), b(100, 0, 20, 10), b(30, 0, 10, 10)],
      'horizontal',
    );
    // Span 0..120, sizes 40, so two gaps of 40: the middle box goes to 50.
    expect(out.map((o) => o.x)).toEqual([0, 100, 50]);
  });
  it('vertical', () => {
    const out = distributeBoxes(
      [b(0, 0, 10, 10), b(0, 20, 10, 10), b(0, 90, 10, 10)],
      'vertical',
    );
    expect(out.map((o) => o.y)).toEqual([0, 45, 90]);
  });
  it('needs three boxes', () => {
    expect(distributeBoxes(boxes.slice(0, 2), 'vertical')).toEqual(
      boxes.slice(0, 2),
    );
  });
});
