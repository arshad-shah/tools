import { describe, expect, it } from 'vitest';
import { lineAt, topFor } from './line-map';

const blocks = [
  { line: 1, top: 0 },
  { line: 5, top: 100 },
  { line: 20, top: 400 },
];

describe('line map', () => {
  it('interpolates the line at a scroll offset', () => {
    expect(lineAt(blocks, 0)).toBe(1);
    expect(lineAt(blocks, 50)).toBe(3);
    expect(lineAt(blocks, 250)).toBe(12.5);
    expect(lineAt(blocks, 999)).toBe(20);
    expect(lineAt([], 10)).toBe(1);
  });
  it('maps a line back to an offset', () => {
    expect(topFor(blocks, 3)).toBe(50);
    expect(topFor(blocks, 12.5)).toBe(250);
    expect(topFor(blocks, 30)).toBe(400);
    expect(topFor([], 3)).toBe(0);
  });
});
