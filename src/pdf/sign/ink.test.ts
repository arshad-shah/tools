import { describe, expect, it } from 'vitest';
import {
  fitVectorToBox,
  INK_WEIGHTS,
  inkOutline,
  inkToVector,
  outlineToPath,
  pointFromEvent,
  simulatedPressure,
  type InkPoint,
  type InkStroke,
} from './ink';

const pt = (x: number, y: number, t = 0, pressure = 0.5): InkPoint => ({
  x,
  y,
  pressure,
  tiltX: 0,
  tiltY: 0,
  t,
});

/** A straight horizontal stroke with evenly spaced samples. */
const line = (from: number, to: number, y: number, n = 3): InkStroke =>
  Array.from({ length: n }, (_, i) =>
    pt(from + ((to - from) * i) / (n - 1), y, i * 16),
  );

/** Vertical extent of the outline polygon at x (the stroke's width there). */
function widthAt(outline: [number, number][], x: number) {
  const ys: number[] = [];
  outline.forEach(([x0, y0], i) => {
    const [x1, y1] = outline[(i + 1) % outline.length];
    if (x0 === x1 || x < Math.min(x0, x1) || x > Math.max(x0, x1)) return;
    ys.push(y0 + ((x - x0) / (x1 - x0)) * (y1 - y0));
  });
  return ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
}

describe('simulatedPressure', () => {
  it('a slow move raises the pressure towards 1', () => {
    const p = simulatedPressure(pt(0, 0, 0), 1, 0, 16, 0.5);
    expect(p).toBeGreaterThan(0.5);
    expect(p).toBeLessThanOrEqual(1);
  });

  it('a fast move lowers the pressure towards 0.2', () => {
    const p = simulatedPressure(pt(0, 0, 0), 40, 0, 16, 0.5);
    expect(p).toBeLessThan(0.5);
    expect(p).toBeGreaterThanOrEqual(0.2);
  });

  it('stays between 0.2 and 1 however long the move goes on', () => {
    let fast = 0.5;
    let slow = 0.5;
    for (let i = 0; i < 50; i++) {
      fast = simulatedPressure(pt(0, 0, 0), 400, 0, 1, fast);
      slow = simulatedPressure(pt(0, 0, 0), 0, 0, 100, slow);
    }
    expect(fast).toBeCloseTo(0.2, 3);
    expect(slow).toBeCloseTo(1, 3);
  });

  it('the first sample of a stroke keeps the starting pressure', () => {
    expect(simulatedPressure(null, 5, 5, 0, 0.5)).toBe(0.5);
  });
});

describe('pointFromEvent', () => {
  const rect = { left: 10, top: 20 } as DOMRect;
  const ev = (o: Partial<PointerEvent>) =>
    ({
      clientX: 15,
      clientY: 30,
      pressure: 0,
      tiltX: 0,
      tiltY: 0,
      timeStamp: 100,
      pointerType: 'mouse',
      ...o,
    }) as PointerEvent;

  it('a pen reports its real pressure and tilt, in pad px', () => {
    const p = pointFromEvent(
      ev({ pointerType: 'pen', pressure: 0.8, tiltX: 30, tiltY: -10 }),
      rect,
      null,
    );
    expect(p).toEqual({
      x: 5,
      y: 10,
      pressure: 0.8,
      tiltX: 30,
      tiltY: -10,
      t: 100,
    });
  });

  it('a pen pressure of 0 means unknown: 0.5', () => {
    expect(
      pointFromEvent(ev({ pointerType: 'pen' }), rect, null).pressure,
    ).toBe(0.5);
  });

  it('a mouse simulates pressure from velocity', () => {
    const prev = pt(0, 0, 0);
    const p = pointFromEvent(
      ev({ clientX: 60, clientY: 20, timeStamp: 16, pressure: 0.5 }),
      rect,
      prev,
    );
    expect(p.pressure).toBeLessThan(0.5);
  });
});

describe('inkOutline', () => {
  it('a straight stroke is about the weight wide in the middle and tapers at both ends', () => {
    // Pointer samples arrive every few px; three samples are too coarse for
    // perfect-freehand's streamlining to reach full width.
    const outline = inkOutline(line(0, 100, 50, 11), 'bold');
    const size = INK_WEIGHTS.bold;
    const mid = widthAt(outline, 50);
    expect(mid).toBeGreaterThan(size * 0.6);
    expect(mid).toBeLessThan(size * 1.4);
    expect(widthAt(outline, 5)).toBeLessThan(mid * 0.4);
    expect(widthAt(outline, 95)).toBeLessThan(mid * 0.4);
  });

  it('scales with the weight and the scale factor', () => {
    const stroke = line(0, 100, 50, 11);
    const thin = widthAt(inkOutline(stroke, 'thin'), 50);
    const bold = widthAt(inkOutline(stroke, 'bold'), 50);
    const big = widthAt(inkOutline(stroke, 'thin', 2), 50);
    expect(bold).toBeGreaterThan(thin);
    expect(big).toBeGreaterThan(thin * 1.5);
  });

  it('tilt widens the nib', () => {
    const flat = line(0, 100, 50, 11);
    const tilted = flat.map((p) => ({ ...p, tiltX: 60 }));
    expect(widthAt(inkOutline(tilted, 'medium'), 50)).toBeGreaterThan(
      widthAt(inkOutline(flat, 'medium'), 50),
    );
  });
});

describe('outlineToPath', () => {
  it('uses only move, cubic and close commands', () => {
    const d = outlineToPath(inkOutline(line(0, 100, 50, 6), 'medium'));
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d.replace(/[-\d.e\s,]/g, '')).toMatch(/^MC+Z$/);
  });

  it('is empty for an outline with nothing to fill', () => {
    expect(outlineToPath([])).toBe('');
    expect(outlineToPath([[1, 1]])).toBe('');
  });

  it('turns each quadratic into the equivalent cubic', () => {
    // Square outline: segment 1 runs from the midpoint (0, 5) via the
    // control (0, 0) to (5, 0); cubic controls sit 2/3 of the way to it.
    const d = outlineToPath([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]);
    expect(d.startsWith('M0 5C0 1.67 1.67 0 5 0')).toBe(true);
  });
});

describe('inkToVector', () => {
  const strokes = [line(20, 80, 30, 5), line(40, 120, 70, 5)];

  it('frames every stroke, cropped to the ink plus 2px', () => {
    const v = inkToVector(strokes, 'medium', { width: 200, height: 100 });
    const outline = [
      ...inkOutline(strokes[0], 'medium'),
      ...inkOutline(strokes[1], 'medium'),
    ];
    const xs = outline.map((p) => p[0]);
    const ys = outline.map((p) => p[1]);
    expect(v.width).toBeCloseTo(Math.max(...xs) - Math.min(...xs) + 4, 1);
    expect(v.height).toBeCloseTo(Math.max(...ys) - Math.min(...ys) + 4, 1);
    // One subpath per stroke, all inside the frame.
    expect(v.d.match(/M/g)).toHaveLength(2);
    const nums = v.d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    const px = nums.filter((_, i) => i % 2 === 0);
    const py = nums.filter((_, i) => i % 2 === 1);
    expect(Math.min(...px)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...px)).toBeLessThanOrEqual(v.width);
    expect(Math.min(...py)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...py)).toBeLessThanOrEqual(v.height);
  });

  it('keeps ink inside the pad', () => {
    const v = inkToVector([line(-50, 500, 30, 5)], 'thin', {
      width: 200,
      height: 100,
    });
    expect(v.width).toBeLessThan(200 + 12);
  });

  it('frames a very long drawing without overflowing the call stack', () => {
    // Far more outline points than a spread call can take as arguments.
    const many = Array.from({ length: 1000 }, (_, i) =>
      line(10, 190, 10 + (i % 80), 600),
    );
    const v = inkToVector(many, 'thin', { width: 200, height: 100 });
    expect(v.width).toBeGreaterThan(180);
    expect(v.height).toBeGreaterThan(79);
  }, 20_000);

  it('refuses an empty drawing', () => {
    expect(() => inkToVector([], 'thin', { width: 10, height: 10 })).toThrow(
      /draw/i,
    );
  });
});

describe('fitVectorToBox', () => {
  const apply = (m: number[], x: number, y: number) => [
    m[0] * x + m[2] * y + m[4],
    m[1] * x + m[3] * y + m[5],
  ];

  it('keeps the aspect, centres in the box and flips y', () => {
    const v = { d: 'M0 0Z', width: 100, height: 50 };
    const box = { x: 10, y: 20, width: 100, height: 100 };
    const { d, transform } = fitVectorToBox(v, box);
    expect(d).toBe(v.d);
    expect(transform[0]).toBeCloseTo(1);
    expect(transform[3]).toBeCloseTo(-1);
    // Pad top-left lands top-left of the centred frame (y up on the page).
    expect(apply(transform, 0, 0)).toEqual([10, 95]);
    expect(apply(transform, 100, 50)).toEqual([110, 45]);
  });

  it('scales down to the limiting side', () => {
    const { transform } = fitVectorToBox(
      { d: 'M0 0Z', width: 40, height: 80 },
      { x: 0, y: 0, width: 200, height: 40 },
    );
    expect(transform[0]).toBeCloseTo(0.5);
    expect(apply(transform, 0, 0)).toEqual([90, 40]);
    expect(apply(transform, 40, 80)).toEqual([110, 0]);
  });
});
