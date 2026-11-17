import { describe, expect, it } from 'vitest';
import { resolveColors } from '@arshad-shah/cynosure/tokens';
import { withAlpha } from '../src/shared/lib/palette';
import { toolsTheme } from '../src/theme/tools-theme';

/*
 * The tools theme (redesign spec, rule 4) as the app shows it: Cynosure's
 * palette from the tools accent. Every text pair the pages, the drawing
 * surfaces and the exports use is at least WCAG AA (4.5:1); boundaries and
 * indicators at least 3:1 (1.4.11).
 */
const lin = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) =>
    lin(parseInt(hex.slice(i, i + 2), 16) / 255),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** An #rrggbbaa colour composited over an opaque #rrggbb background. */
const over = (fg: string, bg: string) => {
  const a = fg.length === 9 ? parseInt(fg.slice(7, 9), 16) / 255 : 1;
  const ch = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  return `#${[1, 3, 5]
    .map((i) => Math.round(ch(fg, i) * a + ch(bg, i) * (1 - a)))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
};
const opaque = (c: string, bg: string) => (c.length === 9 ? over(c, bg) : c);

const SURFACES = ['bg', 'surface', 'surfaceRaised', 'soft'] as const;
const TEXT = [
  'ink',
  'muted',
  'accentText',
  'dangerText',
  'warningText',
  'successText',
  'infoText',
  'syntaxComment',
  'syntaxKeyword',
  'syntaxString',
  'syntaxNumber',
  'syntaxFunction',
  'syntaxType',
  'syntaxProperty',
  'syntaxTag',
  'syntaxAttribute',
  'syntaxRegexp',
] as const;

describe.each(['light', 'dark'] as const)('%s palette', (palette) => {
  const c = resolveColors(toolsTheme, palette);

  it.each(TEXT.flatMap((t) => SURFACES.map((s) => [t, s] as const)))(
    '%s on %s >= 4.5',
    (text, surface) => {
      const bg = opaque(c[surface], c.surface);
      expect(ratio(opaque(c[text], bg), bg)).toBeGreaterThanOrEqual(4.5);
    },
  );

  // Cynosure gap: accent text on the accent's soft fill was 4.2:1 in 0.6.
  it('accent text on the accent soft fill >= 4.5 (Cynosure 0.7.0)', () => {
    const fill = opaque(c.accentSoft, c.surface);
    expect(ratio(c.accentText, fill)).toBeGreaterThanOrEqual(4.5);
  });

  it('text on the accent fill >= 4.5', () => {
    expect(ratio(c.onAccent, c.accent)).toBeGreaterThanOrEqual(4.5);
  });

  // The diff report's added and removed lines (exports, editor tints).
  it.each([0.14, 0.34])('ink on success and danger tints (%s) >= 4.5', (a) => {
    for (const tone of [c.success, c.danger])
      expect(
        ratio(c.ink, over(withAlpha(tone, a), c.surface)),
      ).toBeGreaterThanOrEqual(4.5);
  });

  it.each(SURFACES)('the focus ring colour on %s >= 3', (surface) => {
    const bg = opaque(c[surface], c.surface);
    expect(ratio(c.accentText, bg)).toBeGreaterThanOrEqual(3);
  });
});
