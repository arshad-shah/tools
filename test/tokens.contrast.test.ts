import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/theme/tokens.css', 'utf8');

/** Colour tokens (#rrggbb or #rrggbbaa) declared in one theme block. */
function block(selector: RegExp): Record<string, string> {
  const m = selector.exec(css);
  if (!m) throw new Error(`no block ${selector}`);
  const body = css.slice(m.index + m[0].length, css.indexOf('}', m.index));
  return Object.fromEntries(
    [
      ...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6}(?:[0-9a-f]{2})?);/gi),
    ].map((x) => [x[1], x[2]]),
  );
}

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

/** An #rrggbbaa token composited over an opaque #rrggbb background. */
const over = (fg: string, bg: string) => {
  const a = fg.length === 9 ? parseInt(fg.slice(7, 9), 16) / 255 : 1;
  const ch = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  return `#${[1, 3, 5]
    .map((i) => Math.round(ch(fg, i) * a + ch(bg, i) * (1 - a)))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
};

const themes = {
  light: block(/:root,\s*:root\[data-theme='light'\]\s*\{/),
  dark: block(/:root\[data-theme='dark'\]\s*\{/),
};

// [foreground, background, minimum]: every pair used for text (spec §4.2).
const PAIRS: [string, string, number][] = [
  ['fg', 'canvas', 7],
  ['fg', 'surface', 7],
  ['fg', 'surface-2', 7],
  ['fg', 'surface-3', 7],
  ['fg-muted', 'surface', 7],
  ['fg-muted', 'canvas', 4.5],
  ['fg-muted', 'surface-2', 4.5],
  ['fg-subtle', 'surface', 4.5],
  ['fg-subtle', 'canvas', 4.5],
  ['fg-subtle', 'surface-2', 4.5], // placeholders sit on input fills
  ['fg-subtle', 'surface-3', 4.5], // meta on selected and hovered rows
  ['accent-ink', 'accent', 10],
  ['accent-fg', 'surface', 4.5],
  ['accent-fg', 'canvas', 4.5],
  ['accent-fg', 'surface-2', 4.5],
  // A2-12 codemod: legacy mint text-accent became accent-fg, which also sits
  // on hovered and selected rows (tool card icons, JSON and JWT values).
  ['accent-fg', 'surface-3', 4.5],
  ['danger', 'surface', 4.5],
  ['warning', 'surface', 4.5],
  ['info', 'surface', 4.5],
  // Status text inside tools sits on input fills and the app canvas too.
  ['danger', 'surface-2', 4.5],
  ['danger', 'canvas', 4.5],
  ['warning', 'surface-2', 4.5],
  ['info', 'surface-2', 4.5],
  ['logo-glyph', 'logo-tile', 7],
  // Solid badges: canvas-coloured text on status fills.
  ['canvas', 'warning', 4.5],
  ['canvas', 'danger', 4.5],
  ['canvas', 'info', 4.5],
];

// WCAG 1.4.11 non-text contrast (>= 3:1): control boundaries, the focus
// ring and state indicators (tab underline, switch on, progress fill).
const NON_TEXT: [string, string][] = [
  ...['canvas', 'surface', 'surface-2', 'surface-3'].flatMap(
    (bg): [string, string][] => [
      ['line-control', bg],
      ['focus', bg],
      ['accent-indicator', bg],
    ],
  ),
];

// Status text on its own soft fill (badges, danger buttons): [text, fill].
const SOFT_PAIRS: [string, string][] = [
  ['danger', 'danger-soft'],
  ['warning', 'warning-soft'],
  ['info', 'info-soft'],
  ['accent-fg', 'accent-soft'],
  // A2: selected page tiles (bg-accent-soft) keep their fg and fg-muted text.
  ['fg', 'accent-soft'],
  ['fg-muted', 'accent-soft'],
];

describe('token file', () => {
  it('both themes define the same colour roles', () => {
    expect(Object.keys(themes.light).sort()).toEqual(
      Object.keys(themes.dark).sort(),
    );
  });
  it('soft fills are read', () => {
    expect(themes.light['danger-soft']).toMatch(/^#[0-9a-f]{8}$/i);
  });
});

describe.each(Object.entries(themes))('%s theme contrast', (_name, t) => {
  it.each(PAIRS)('%s on %s >= %d', (fg, bg, min) => {
    expect(t[fg], fg).toBeDefined();
    expect(t[bg], bg).toBeDefined();
    expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(min);
  });
});

describe.each(Object.entries(themes))('%s theme soft fills', (_name, t) => {
  for (const base of ['canvas', 'surface', 'surface-2']) {
    it.each(SOFT_PAIRS)(`%s on %s over ${base} >= 4.5`, (fg, fill) => {
      expect(ratio(t[fg], over(t[fill], t[base]))).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe.each(Object.entries(themes))('%s theme non-text', (_name, t) => {
  it.each(NON_TEXT)('%s on %s >= 3', (fg, bg) => {
    expect(t[fg], fg).toBeDefined();
    expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(3);
  });
});
