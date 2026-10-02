import { describe, expect, it } from 'vitest';
import { linearScale, snap } from './scales';
import { niceTicks, pickTimeInterval, timeTicks } from './ticks';

describe('niceTicks', () => {
  it('covers 0 to 97 in steps of 20', () => {
    expect(niceTicks(0, 97, 5)).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it('covers -0.3 to 0.7 in clean steps of 0.2', () => {
    expect(niceTicks(-0.3, 0.7, 5)).toEqual([
      -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8,
    ]);
  });

  it('widens an empty range instead of dividing by zero', () => {
    const t = niceTicks(5, 5, 4);
    expect(t[0]).toBeLessThan(5);
    expect(t[t.length - 1]).toBeGreaterThan(5);
  });
});

describe('timeTicks', () => {
  it('puts ticks on day boundaries over three days', () => {
    const start = new Date(2026, 0, 1, 6, 30);
    const end = new Date(2026, 0, 4, 6, 30);
    expect(pickTimeInterval(+start, +end, 5).unit).toBe('day');
    const ticks = timeTicks(start, end, 5).map((t) => new Date(t));
    expect(ticks.map((d) => d.getDate())).toEqual([2, 3, 4]);
    for (const d of ticks) {
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
    }
  });

  it('uses hours for a single day', () => {
    const start = new Date(2026, 0, 1, 0, 0);
    const end = new Date(2026, 0, 1, 23, 0);
    const ticks = timeTicks(start, end, 6).map((t) => new Date(t));
    expect(ticks.every((d) => d.getMinutes() === 0)).toBe(true);
    expect(ticks.length).toBeGreaterThan(3);
  });
});

describe('scales', () => {
  it('maps and inverts linearly', () => {
    const s = linearScale([0, 10], [100, 0]);
    expect(s.map(5)).toBe(50);
    expect(s.invert(25)).toBe(7.5);
  });

  it('snaps to the device pixel grid', () => {
    expect(snap(10.3, 2)).toBe(10.5);
    expect(snap(10.3, 1, true)).toBe(10.5);
  });
});
