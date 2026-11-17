import { describe, expect, it } from 'vitest';
import {
  clickObject,
  dragObject,
  extendPen,
  placedObject,
  type ToolId,
} from './draft';
import { boundsOfObject } from './model';

const style = { color: '#ff0000', width: 4 };
const image = { width: 1000, height: 500 };
const measure = (text: string, size: number) => ({
  width: text.length * size * 0.5,
  height: size * 1.25,
});

describe('drafting objects', () => {
  it('drags out lines, boxes and redactions', () => {
    const a = { x: 100, y: 100 };
    const b = { x: 40, y: 160 };
    expect(dragObject('arrow', 'x', a, b, style, image)).toMatchObject({
      type: 'arrow',
      from: a,
      to: b,
      color: '#ff0000',
      width: 4,
    });
    expect(dragObject('rect', 'x', a, b, style, image)).toMatchObject({
      box: { x: 40, y: 100, width: 60, height: 60 },
    });
    expect(dragObject('pixelate', 'x', a, b, style, image)).toMatchObject({
      type: 'pixelate',
      strength: 8,
    });
  });

  it('ignores drags shorter than a click and tools placed by click', () => {
    const a = { x: 10, y: 10 };
    expect(
      dragObject('rect', 'x', a, { x: 11, y: 11 }, style, image),
    ).toBeNull();
    expect(
      dragObject('text', 'x', a, { x: 100, y: 100 }, style, image),
    ).toBeNull();
  });

  it('places text and steps on a click', () => {
    const p = { x: 30, y: 40 };
    expect(clickObject('text', 't', p, style, image, measure)).toMatchObject({
      type: 'text',
      at: p,
      text: 'Text',
      size: 20,
      measured: { width: 40, height: 25 },
    });
    expect(clickObject('step', 's', p, style, image, measure)).toMatchObject({
      type: 'step',
      center: p,
      radius: 15,
    });
    expect(clickObject('rect', 'r', p, style, image, measure)).toBeNull();
  });

  it('places every tool in the middle for the keyboard', () => {
    const tools: ToolId[] = [
      'arrow',
      'line',
      'rect',
      'ellipse',
      'highlight',
      'blur',
      'pixelate',
      'pen',
      'text',
      'step',
    ];
    for (const tool of tools) {
      const o = placedObject(tool, 'k', style, image, measure);
      expect(o?.type).toBe(tool);
      const b = boundsOfObject(o!);
      expect(b.x + b.width / 2).toBeCloseTo(500, 0);
      expect(b.y + b.height / 2).toBeCloseTo(250, 0);
    }
    expect(placedObject('select', 'k', style, image, measure)).toBeNull();
  });

  it('skips pen samples closer than half a pixel', () => {
    const pts = [{ x: 0, y: 0, p: 0.5 }];
    expect(extendPen(pts, { x: 0.2, y: 0.2, p: 0.5 })).toBe(pts);
    expect(extendPen(pts, { x: 2, y: 0, p: 0.5 })).toHaveLength(2);
  });
});
