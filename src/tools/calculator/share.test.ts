import { describe, expect, it } from 'vitest';
import { parseCalculatorShare } from './share';

describe('calculator share state', () => {
  const ok = { lines: ['a = 5', 'a * 2'], angle: 'rad', precision: 14 };
  it('accepts a valid sheet', () => {
    expect(parseCalculatorShare(ok)).toEqual(ok);
  });
  it('refuses anything else', () => {
    for (const bad of [
      undefined,
      { ...ok, lines: [] },
      { ...ok, lines: [1] },
      { ...ok, lines: ['x'.repeat(2001)] },
      { ...ok, angle: 'grad' },
      { ...ok, precision: 3 },
      { ...ok, precision: 65 },
    ])
      expect(parseCalculatorShare(bad)).toBeNull();
  });
});
