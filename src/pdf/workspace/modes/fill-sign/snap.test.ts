import { describe, expect, it } from 'vitest';
import { clampToPage, markBox, snapToCell } from './snap';

const label = { x: 50, y: 700, width: 160, height: 22 };
const value = { x: 210, y: 700, width: 340, height: 22 };

describe('snapToCell', () => {
  it('snaps a click inside a label cell to that cell, left-padded', () => {
    const { box, cell } = snapToCell({ x: 120, y: 710 }, [label, value]);
    expect(cell).toEqual(label);
    expect(box.x).toBe(53);
    expect(box.width).toBe(154);
    expect(box.y).toBeGreaterThanOrEqual(label.y);
    expect(box.y + box.height).toBeLessThanOrEqual(label.y + label.height);
  });

  it('outside cells, sits on the click baseline', () => {
    expect(snapToCell({ x: 100, y: 300 }, [label]).box).toEqual({
      x: 100,
      y: 300,
      width: 160,
      height: 13.75,
    });
  });

  it('centres marks on the point', () => {
    expect(markBox({ x: 100, y: 100 })).toEqual({
      x: 95,
      y: 95,
      width: 10,
      height: 10,
    });
  });
});

describe('clampToPage', () => {
  const page = { x: 0, y: 0, width: 612, height: 792 };
  it('narrows a box that would run off the right edge', () => {
    expect(
      clampToPage({ x: 500, y: 100, width: 160, height: 14 }, page),
    ).toEqual({ x: 500, y: 100, width: 112, height: 14 });
  });
  it('moves a box left only when the minimum width does not fit', () => {
    expect(
      clampToPage({ x: 600, y: 100, width: 160, height: 14 }, page),
    ).toEqual({ x: 572, y: 100, width: 40, height: 14 });
  });
  it('keeps a box inside the top edge', () => {
    expect(
      clampToPage({ x: 10, y: 785, width: 160, height: 14 }, page),
    ).toEqual({ x: 10, y: 778, width: 160, height: 14 });
  });
  it('leaves a box that fits alone', () => {
    const b = { x: 10, y: 10, width: 160, height: 14 };
    expect(clampToPage(b, page)).toEqual(b);
  });
});
