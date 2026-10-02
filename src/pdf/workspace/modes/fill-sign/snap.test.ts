import { describe, expect, it } from 'vitest';
import { markBox, snapToCell } from './snap';

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
