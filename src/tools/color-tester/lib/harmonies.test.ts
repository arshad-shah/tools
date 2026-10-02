import { describe, expect, it } from 'vitest';
import { parseColor, toOklch } from '@/shared/lib/colour';
import { harmonies, viewAs } from './harmonies';

describe('harmonies', () => {
  it('rotates the OKLCH hue for each harmony', () => {
    const base = parseColor('#3b82f6');
    const all = harmonies(base);
    expect(all.map((h) => h.kind)).toEqual([
      'complementary',
      'analogous',
      'triadic',
      'split',
      'tetradic',
    ]);
    expect(all.map((h) => h.colors.length)).toEqual([2, 3, 3, 3, 4]);
    const comp = toOklch(parseColor(all[0].colors[1]));
    const turn = (((comp.h - toOklch(base).h) % 360) + 360) % 360;
    const diff = Math.abs(turn - 180);
    expect(diff).toBeLessThan(20);
  });

  it('viewAs leaves colours alone without a deficiency', () => {
    expect(viewAs(parseColor('#ff0000'), 'none')).toBe('#ff0000');
    expect(viewAs(parseColor('#ff0000'), 'achroma')).not.toBe('#ff0000');
  });
});
