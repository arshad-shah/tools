import { describe, expect, it } from 'vitest';
import { charSpans } from './advance';

describe('charSpans', () => {
  it('shares a run width by standard widths, end to end', () => {
    const { offsets, widths } = charSpans(Array.from('Il.'), 100);
    // I 278, l 222, . 278 of 778.
    expect(widths[0]).toBeCloseTo((278 / 778) * 100);
    expect(widths[1]).toBeCloseTo((222 / 778) * 100);
    expect(offsets[2] + widths[2]).toBeCloseTo(100);
  });
  it('gives a label followed by a dotted leader its real share', () => {
    const chars = Array.from('Occupation ....');
    const { offsets } = charSpans(chars, 100);
    // The dots start well after 11/15 of the way (equal shares).
    expect(offsets[11]).toBeGreaterThan((11 / 15) * 100);
  });
});
