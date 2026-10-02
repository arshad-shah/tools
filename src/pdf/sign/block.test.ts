import { describe, expect, it } from 'vitest';
import type { Box } from '@/pdf/doc/types';
import { formatBlockDate, layoutBlock, type BlockContent } from './block';

const content = (patch: Partial<BlockContent> = {}): BlockContent => ({
  signature: {
    kind: 'ink',
    vector: { d: 'M0 0C1 1 2 2 3 3Z', width: 3, height: 3 },
    color: '#111827',
  },
  name: 'Ada Lovelace',
  title: 'Analyst',
  dateIso: '2026-10-01',
  locale: 'en-GB',
  showDate: true,
  ...patch,
});

const inside = (b: Box, r: Box) =>
  b.x >= r.x - 1e-9 &&
  b.y >= r.y - 1e-9 &&
  b.x + b.width <= r.x + r.width + 1e-9 &&
  b.y + b.height <= r.y + r.height + 1e-9;

const overlap = (a: Box, b: Box) =>
  a.x < b.x + b.width - 1e-9 &&
  b.x < a.x + a.width - 1e-9 &&
  a.y < b.y + b.height - 1e-9 &&
  b.y < a.y + a.height - 1e-9;

describe('formatBlockDate', () => {
  it('writes the date in the long style of the locale', () => {
    expect(formatBlockDate('2026-10-01', 'en-GB')).toBe('1 October 2026');
    expect(formatBlockDate('2026-10-01', 'en-US')).toBe('October 1, 2026');
  });

  it('keeps the calendar day whatever the time zone', () => {
    expect(formatBlockDate('2026-01-01', 'en-GB')).toBe('1 January 2026');
  });
});

describe('layoutBlock', () => {
  const rect = { x: 50, y: 100, width: 240, height: 120 };

  it('stacks the signature over name, title and date inside the rect', () => {
    const l = layoutBlock(rect, content());
    const boxes = [l.signature, l.name, l.title!, l.date!];
    for (const b of boxes) expect(inside(b, rect)).toBe(true);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++)
        expect(overlap(boxes[i], boxes[j])).toBe(false);
    expect(l.signature.height).toBeCloseTo(rect.height * 0.55);
    // Page space is y up: the signature is on top, the date at the bottom.
    expect(l.signature.y).toBeGreaterThan(l.name.y);
    expect(l.name.y).toBeGreaterThan(l.title!.y);
    expect(l.title!.y).toBeGreaterThan(l.date!.y);
  });

  it('leaves out an empty title and a hidden date', () => {
    const l = layoutBlock(rect, content({ title: ' ', showDate: false }));
    expect(l.title).toBeNull();
    expect(l.date).toBeNull();
    expect(inside(l.name, rect)).toBe(true);
    expect(overlap(l.name, l.signature)).toBe(false);
  });
});
