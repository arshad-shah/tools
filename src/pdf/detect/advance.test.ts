import { describe, expect, it } from 'vitest';
import { charSpans, fontAdvances } from './advance';

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

describe("charSpans with the font's own advances", () => {
  it('shares a monospace run equally', () => {
    const chars = Array.from('Wil1');
    const adv = fontAdvances(chars, { byChar: {}, fallback: 600 });
    const { widths } = charSpans(chars, 24, adv);
    for (const w of widths) expect(w).toBeCloseTo(6);
  });
  it('uses listed widths and falls back to Helvetica for the rest', () => {
    const adv = fontAdvances(Array.from('Wx'), { byChar: { W: 944 } });
    expect(adv).toEqual([944, 500]);
  });
  it('ignores advances of the wrong length', () => {
    const a = charSpans(Array.from('Il'), 10, [1]);
    const b = charSpans(Array.from('Il'), 10);
    expect(a).toEqual(b);
  });
});
