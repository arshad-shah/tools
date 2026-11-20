import { describe, expect, it } from 'vitest';
import { addObject, cropDoc, newDoc, rotateDoc } from './doc';
import { contrastOn, measureWith, paintDoc, type Ctx2D } from './render';
import { exportName, isLossy } from './export';

/** A 2D context that records calls and serves image data of the asked size. */
function recorder() {
  const calls: { name: string; args: unknown[] }[] = [];
  const target: Record<string, unknown> = {
    measureText: (s: string) => ({ width: s.length * 10 }),
    getImageData: (x: number, y: number, w: number, h: number) => {
      calls.push({ name: 'getImageData', args: [x, y, w, h] });
      return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
    },
  };
  const ctx = new Proxy(target, {
    get(t, key: string) {
      if (key in t) return t[key];
      return (...args: unknown[]) => {
        calls.push({ name: key, args });
      };
    },
    set(t, key: string, value) {
      t[key] = value;
      calls.push({ name: `set:${key}`, args: [value] });
      return true;
    },
  });
  return { ctx: ctx as unknown as Ctx2D, calls };
}

const image = {} as CanvasImageSource;

describe('render helpers', () => {
  it('picks a readable text colour', () => {
    expect(contrastOn('#ffff00')).toBe('#000000');
    expect(contrastOn('#1d4ed8')).toBe('#ffffff');
    expect(contrastOn('#fff')).toBe('#000000');
    expect(contrastOn('red')).toBe('#ffffff');
  });

  it('measures the widest line and the line count', () => {
    const { ctx } = recorder();
    expect(measureWith(ctx)('ab\nabcd', 20)).toEqual({ width: 40, height: 50 });
  });

  it('names exports', () => {
    expect(exportName('shot.jpeg', 'png')).toBe('shot.annotated.png');
    expect(exportName('shot.png', 'jpeg')).toBe('shot.annotated.jpg');
    expect(isLossy('png')).toBe(false);
  });
});

describe('paintDoc', () => {
  it('draws the oriented, cropped image then objects, redacting real pixels', () => {
    let doc = cropDoc(rotateDoc(newDoc({ width: 40, height: 20 }), 'cw'), {
      x: 2,
      y: 4,
      width: 10,
      height: 10,
    });
    doc = addObject(doc, {
      id: 'b',
      type: 'pixelate',
      box: { x: -3, y: 1, width: 5, height: 20 },
      strength: 4,
    });
    doc = addObject(doc, {
      id: 'r',
      type: 'rect',
      box: { x: 1, y: 1, width: 3, height: 3 },
      color: '#ff0000',
      width: 2,
    });
    const { ctx, calls } = recorder();
    paintDoc(ctx, { image, doc, background: '#ffffff' });
    const names = calls.map((c) => c.name);
    expect(names.indexOf('drawImage')).toBeLessThan(
      names.indexOf('getImageData'),
    );
    expect(calls.find((c) => c.name === 'translate')?.args).toEqual([-2, -4]);
    expect(calls.find((c) => c.name === 'transform')?.args).toEqual([
      0, 1, -1, 0, 20, 0,
    ]);
    // Clipped to the canvas: x from 0, height to the bottom edge.
    expect(calls.find((c) => c.name === 'getImageData')?.args).toEqual([
      0, 1, 2, 9,
    ]);
    expect(names).toContain('putImageData');
    expect(names).toContain('strokeRect');
    expect(calls.find((c) => c.name === 'fillRect')?.args).toEqual([
      0, 0, 10, 10,
    ]);
  });

  it('while cropping shows the whole image and dims outside the crop', () => {
    const doc = cropDoc(newDoc({ width: 40, height: 20 }), {
      x: 5,
      y: 5,
      width: 10,
      height: 10,
    });
    const { ctx, calls } = recorder();
    paintDoc(ctx, {
      image,
      doc,
      cropping: { x: 1, y: 2, width: 3, height: 4 },
    });
    expect(calls.find((c) => c.name === 'clearRect')?.args).toEqual([
      0, 0, 40, 20,
    ]);
    expect(calls.filter((c) => c.name === 'rect').map((c) => c.args)).toEqual([
      [0, 0, 40, 20],
      [1, 2, 3, 4],
    ]);
    expect(calls.find((c) => c.name === 'fill')?.args).toEqual(['evenodd']);
  });
});
