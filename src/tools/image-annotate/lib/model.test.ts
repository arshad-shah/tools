import { describe, expect, it } from 'vitest';
import {
  boundsOfObject,
  describeObject,
  hitTest,
  moveObject,
  resizeObject,
  restyle,
  stepNumber,
  type AnnotObject,
} from './model';

const measure = (text: string, size: number) => ({
  width: text.length * size * 0.5,
  height: size * 1.25,
});

const arrow: AnnotObject = {
  id: 'a',
  type: 'arrow',
  from: { x: 10, y: 10 },
  to: { x: 110, y: 60 },
  color: '#ff0000',
  width: 4,
};
const rect: AnnotObject = {
  id: 'r',
  type: 'rect',
  box: { x: 50, y: 50, width: 100, height: 40 },
  color: '#00ff00',
  width: 2,
};
const step1: AnnotObject = {
  id: 's1',
  type: 'step',
  center: { x: 200, y: 200 },
  radius: 10,
  color: '#0000ff',
};
const step2: AnnotObject = { ...step1, id: 's2', center: { x: 300, y: 200 } };
const text: AnnotObject = {
  id: 't',
  type: 'text',
  at: { x: 0, y: 100 },
  text: 'Hello\nworld',
  color: '#000000',
  size: 20,
  measured: { width: 50, height: 50 },
};
const blur: AnnotObject = {
  id: 'b',
  type: 'blur',
  box: { x: 0, y: 0, width: 10, height: 10 },
  strength: 8,
};

describe('object geometry', () => {
  it('has bounds for every kind', () => {
    expect(boundsOfObject(arrow)).toEqual({
      x: 10,
      y: 10,
      width: 100,
      height: 50,
    });
    expect(boundsOfObject(step1)).toEqual({
      x: 190,
      y: 190,
      width: 20,
      height: 20,
    });
    expect(boundsOfObject(text)).toEqual({
      x: 0,
      y: 100,
      width: 50,
      height: 50,
    });
  });

  it('moves every point', () => {
    const moved = moveObject(arrow, 5, -5);
    expect(moved).toMatchObject({
      from: { x: 15, y: 5 },
      to: { x: 115, y: 55 },
    });
    expect(moveObject(rect, 1, 2)).toMatchObject({ box: { x: 51, y: 52 } });
    expect(arrow.from).toEqual({ x: 10, y: 10 });
  });

  it('resizes into a new box, keeping relative positions', () => {
    const r = resizeObject(
      arrow,
      { x: 0, y: 0, width: 50, height: 100 },
      measure,
    );
    expect(r).toMatchObject({ from: { x: 0, y: 0 }, to: { x: 50, y: 100 } });
    const pen = resizeObject(
      {
        id: 'p',
        type: 'pen',
        points: [
          { x: 0, y: 0, p: 0.5 },
          { x: 10, y: 0, p: 0.5 },
        ],
        color: '#000',
        width: 2,
      },
      { x: 5, y: 5, width: 20, height: 9 },
      measure,
    );
    expect(pen).toMatchObject({
      points: [
        { x: 5, y: 5 },
        { x: 25, y: 5 },
      ],
    });
  });

  it('scales text by height and steps by the smaller side', () => {
    const t = resizeObject(
      text,
      { x: 1, y: 2, width: 99, height: 100 },
      measure,
    );
    expect(t).toMatchObject({ at: { x: 1, y: 2 }, size: 40 });
    expect(t.type === 'text' && t.measured.width).toBe(
      measure('Hello\nworld', 40).width,
    );
    expect(
      resizeObject(step1, { x: 0, y: 0, width: 40, height: 30 }, measure),
    ).toMatchObject({
      center: { x: 20, y: 15 },
      radius: 15,
    });
  });
});

describe('hit testing', () => {
  const objects = [rect, arrow, step1];
  it('finds the topmost object under the point', () => {
    expect(hitTest(objects, { x: 60, y: 35 }, 2)?.id).toBe('a');
    expect(hitTest(objects, { x: 140, y: 85 }, 2)?.id).toBe('r');
    expect(hitTest(objects, { x: 205, y: 205 }, 0)?.id).toBe('s1');
    expect(hitTest(objects, { x: 400, y: 400 }, 4)).toBeNull();
  });

  it('hits an ellipse inside its curve only', () => {
    const e: AnnotObject = { ...rect, id: 'e', type: 'ellipse' };
    expect(hitTest([e], { x: 100, y: 70 }, 0)?.id).toBe('e');
    expect(hitTest([e], { x: 51, y: 51 }, 0)).toBeNull();
  });
});

describe('naming and numbering', () => {
  const objects = [step1, arrow, step2, text];
  it('numbers steps by their order', () => {
    expect(stepNumber(objects, 's2')).toBe(2);
    expect(describeObject(objects, step2)).toBe('Step 2');
    expect(describeObject(objects, arrow)).toBe('Arrow 1');
    expect(describeObject(objects, text)).toBe('Text: Hello');
  });

  it('restyles colour and width, never a redaction', () => {
    expect(restyle(arrow, { color: '#123456', width: 9 })).toMatchObject({
      color: '#123456',
      width: 9,
    });
    expect(restyle(step1, { width: 9 })).not.toHaveProperty('width');
    expect(restyle(blur, { color: '#fff' })).toBe(blur);
  });
});
