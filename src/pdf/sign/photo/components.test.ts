import { describe, expect, it } from 'vitest';
import { close3, despeckle, dropBorderComponents } from './components';
import { countInk, emptyMask } from './test-images';

describe('despeckle', () => {
  it('removes 3-pixel specks and keeps the stroke', () => {
    const m = emptyMask(120, 40);
    const set = (x: number, y: number) => (m.data[y * 120 + x] = 1);
    for (let x = 10; x < 110; x++) for (let y = 18; y < 22; y++) set(x, y);
    for (const [x, y] of [
      [5, 5],
      [60, 5],
      [100, 33],
    ]) {
      set(x, y);
      set(x + 1, y);
      set(x + 1, y + 1);
    }
    const out = despeckle(m, 8);
    expect(countInk(out)).toBe(400);
    expect(out.data[20 * 120 + 50]).toBe(1);
    expect(out.data[5 * 120 + 60]).toBe(0);
  });
});

describe('close3', () => {
  it('bridges a one-pixel gap in a stroke', () => {
    const m = emptyMask(30, 9);
    for (let x = 2; x < 28; x++)
      if (x !== 15) for (let y = 3; y < 6; y++) m.data[y * 30 + x] = 1;
    const out = close3(m);
    expect(out.data[4 * 30 + 15]).toBe(1);
    expect(out.data[0]).toBe(0);
    expect(countInk(out)).toBe(26 * 3);
  });
});

describe('dropBorderComponents', () => {
  it('drops components touching the edge and keeps the rest', () => {
    const m = emptyMask(50, 20);
    for (let y = 0; y < 20; y++) m.data[y * 50] = 1;
    for (let x = 20; x < 30; x++) m.data[10 * 50 + x] = 1;
    const out = dropBorderComponents(m);
    expect(countInk(out)).toBe(10);
    expect(out.data[0]).toBe(0);
  });
});
