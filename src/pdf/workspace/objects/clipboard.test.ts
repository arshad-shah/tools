import { describe, expect, it } from 'vitest';
import type { Operation } from '@/pdf/doc/types';
import { createObjectClipboard, PASTE_OFFSET } from './clipboard';

const b = (x: number, y: number, width: number, height: number) => ({
  x,
  y,
  width,
  height,
});

describe('object clipboard', () => {
  const op = (type: string, params: Record<string, unknown>): Operation => ({
    id: 'o',
    type,
    v: 1,
    params,
    at: 0,
    label: '',
  });
  it('pastes copies with new ids and an offset that grows per paste', () => {
    let n = 0;
    const clip = createObjectClipboard(() => `new${n++}`);
    clip.copy([
      op('content.text', {
        id: 'a',
        pageId: 'p1',
        rect: b(10, 100, 20, 10),
        text: 'Hi',
      }),
      op('annot.ink', {
        id: 'b',
        pageId: 'p1',
        strokes: [
          [
            [1, 2],
            [3, 4],
          ],
        ],
      }),
    ]);
    const first = clip.paste('p2');
    expect(first.map((o) => (o.params as { id: string }).id)).toEqual([
      'new0',
      'new1',
    ]);
    expect(first[0].params).toMatchObject({
      pageId: 'p2',
      rect: b(10 + PASTE_OFFSET, 100 - PASTE_OFFSET, 20, 10),
      text: 'Hi',
    });
    expect(
      (first[1].params as { strokes: number[][][] }).strokes[0][0],
    ).toEqual([11, -8]);
    const second = clip.paste('p2');
    expect((second[0].params as { rect: { x: number } }).rect.x).toBe(
      10 + 2 * PASTE_OFFSET,
    );
  });
  it('content line ends are fractions and do not move', () => {
    const clip = createObjectClipboard(() => 'x');
    clip.copy([
      op('content.shape', {
        kind: 'line',
        rect: b(0, 0, 10, 10),
        from: [0, 0],
        to: [1, 1],
      }),
    ]);
    expect(clip.paste('p').at(0)!.params).toMatchObject({
      from: [0, 0],
      to: [1, 1],
      rect: b(10, -10, 10, 10),
    });
  });
  it('gives a pasted free Fill & Sign box its own field id', () => {
    let n = 0;
    const clip = createObjectClipboard(() => `new${n++}`);
    clip.copy([
      op('flat.fill', {
        id: 'a',
        pageId: 'p1',
        rect: b(10, 100, 20, 10),
        kind: 'text',
        value: 'Hi',
        fieldId: 'free:a',
      }),
      op('flat.fill', {
        id: 'b',
        pageId: 'p1',
        rect: b(10, 100, 20, 10),
        kind: 'text',
        value: 'Hi',
        fieldId: 'detected:x',
      }),
    ]);
    const [free, detected] = clip.paste('p1');
    const fieldId = (o: { params: unknown }) =>
      (o.params as { fieldId: string }).fieldId;
    expect(fieldId(free)).toMatch(/^free:new/);
    expect(fieldId(detected)).toBe('detected:x');
  });
});
