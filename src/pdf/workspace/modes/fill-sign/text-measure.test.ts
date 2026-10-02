import { describe, expect, it } from 'vitest';
import { fitsBox, textWidth } from './text-measure';

describe('text measure', () => {
  it('measures Helvetica widths', () => {
    expect(textWidth('Doe', 10)).toBeCloseTo((722 + 556 + 556) / 100);
  });
  it('fits text that shrinks to at least 6pt', () => {
    expect(fitsBox('Doe', { width: 100, height: 12 }, false)).toBe(true);
    expect(fitsBox('x'.repeat(200), { width: 100, height: 12 }, false)).toBe(
      false,
    );
    expect(fitsBox('one two three four', { width: 40, height: 40 }, true)).toBe(
      true,
    );
  });
});
