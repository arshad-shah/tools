import { describe, expect, it } from 'vitest';
import {
  addObject,
  cropDoc,
  docSize,
  flipDoc,
  fullSize,
  newDoc,
  removeObject,
  reorderObject,
  replaceObject,
  rotateDoc,
  type Doc,
} from './doc';
import { applyMatrix, orientMatrix, type Point } from './geometry';
import type { AnnotObject, StepObject } from './model';

const src = { width: 400, height: 300 };

/** Where source pixel `p` lands on the edited image. */
const placed = (d: Doc, p: Point): Point => {
  const q = applyMatrix(orientMatrix(d.source, d.turns, d.flip), p);
  return { x: q.x - d.crop.x, y: q.y - d.crop.y };
};

const marker = (center: Point): StepObject => ({
  id: 'm',
  type: 'step',
  center,
  radius: 5,
  color: '#f00',
});

const close = (a: Point, b: Point) => {
  expect(a.x).toBeCloseTo(b.x, 6);
  expect(a.y).toBeCloseTo(b.y, 6);
};

describe('document operations', () => {
  it('starts as the whole image, unturned', () => {
    const d = newDoc(src);
    expect(d.crop).toEqual({ x: 0, y: 0, width: 400, height: 300 });
    expect(docSize(d)).toEqual(src);
  });

  it('keeps objects on the same image pixel through any turns, flips and crops', () => {
    const anchor = { x: 120, y: 45 };
    let d = addObject(
      cropDoc(newDoc(src), { x: 20, y: 10, width: 300, height: 200 }),
      marker({ x: 100, y: 35 }),
    );
    close(placed(d, anchor), (d.objects[0] as StepObject).center);
    const ops: ((x: Doc) => Doc)[] = [
      (x) => rotateDoc(x, 'cw'),
      (x) => flipDoc(x, 'h'),
      (x) => rotateDoc(x, 'cw'),
      (x) => flipDoc(x, 'v'),
      (x) => cropDoc(x, { x: 30, y: 20, width: 120, height: 150 }),
      (x) => rotateDoc(x, 'ccw'),
      (x) => flipDoc(x, 'h'),
      (x) => rotateDoc(x, 'ccw'),
    ];
    for (const op of ops) {
      d = op(d);
      close(placed(d, anchor), (d.objects[0] as StepObject).center);
    }
  });

  it('four quarter turns come back to the start', () => {
    let d = cropDoc(newDoc(src), { x: 10, y: 20, width: 100, height: 50 });
    const start = d;
    for (let i = 0; i < 4; i++) d = rotateDoc(d, 'cw');
    expect(d.turns).toBe(0);
    expect(d.crop).toEqual(start.crop);
    expect(fullSize(rotateDoc(d, 'cw'))).toEqual({ width: 300, height: 400 });
  });

  it('two flips cancel', () => {
    const d = flipDoc(flipDoc(newDoc(src), 'v'), 'v');
    expect(d.flip).toBe(false);
    expect(d.turns).toBe(0);
  });

  it('crops in whole pixels inside the image', () => {
    const d = cropDoc(newDoc(src), {
      x: -5,
      y: 10.4,
      width: 1000,
      height: 50.6,
    });
    expect(d.crop).toEqual({ x: 0, y: 10, width: 400, height: 51 });
  });

  it('adds, replaces, removes and reorders objects', () => {
    const a = { ...marker({ x: 1, y: 1 }), id: 'a' };
    const b = { ...marker({ x: 2, y: 2 }), id: 'b' };
    const c = { ...marker({ x: 3, y: 3 }), id: 'c' };
    let d = [a, b, c].reduce<Doc>(
      (x, o) => addObject(x, o as AnnotObject),
      newDoc(src),
    );
    const ids = (x: Doc) => x.objects.map((o) => o.id).join('');
    expect(ids(reorderObject(d, 'a', 'forward'))).toBe('bac');
    expect(ids(reorderObject(d, 'a', 'front'))).toBe('bca');
    expect(ids(reorderObject(d, 'c', 'back'))).toBe('cab');
    expect(ids(reorderObject(d, 'a', 'backward'))).toBe('abc');
    d = replaceObject(d, { ...b, radius: 9 });
    expect((d.objects[1] as StepObject).radius).toBe(9);
    expect(ids(removeObject(d, 'b'))).toBe('ac');
  });
});
