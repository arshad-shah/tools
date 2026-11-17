/**
 * Ported from arshad-shah/verql tests/unit/er/erd-theme-bridge.test.ts
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 */
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readDiagramTheme, type ResolveColor } from './theme-bridge';

/** As Cynosure's resolveColor for a bare `--x`: the property's value here. */
const resolve: ResolveColor = (v) =>
  v.startsWith('--')
    ? getComputedStyle(document.documentElement).getPropertyValue(v).trim()
    : '';

const html = () => document.documentElement;
// Token values are opaque strings to the bridge; rgb() keeps them obviously
// test data.
const TOKENS: Record<string, string> = {
  '--cy-color-bg': 'rgb(1, 1, 1)',
  '--cy-color-surface': 'rgb(2, 2, 2)',
  '--cy-color-surface-raised': 'rgb(3, 3, 3)',
  '--cy-color-soft': 'rgb(4, 4, 4)',
  '--cy-color-line': 'rgb(5, 5, 5)',
  '--cy-color-ink': 'rgb(8, 8, 8)',
  '--cy-color-muted': 'rgb(9, 9, 9)',
  '--cy-color-accent-text': 'rgb(12, 12, 12)',
  '--cy-color-accent-soft': 'rgb(13, 13, 13)',
  '--cy-color-warning': 'rgb(16, 16, 16)',
  '--cy-font-mono': 'Mono Test, monospace',
};

beforeEach(() => {
  for (const [k, v] of Object.entries(TOKENS)) html().style.setProperty(k, v);
});
afterEach(() => {
  html().removeAttribute('style');
});

describe('readDiagramTheme', () => {
  it('returns every field as a non-empty string', () => {
    const t = readDiagramTheme(resolve);
    for (const [k, v] of Object.entries(t)) {
      if (k === 'value') {
        for (const [kind, c] of Object.entries(v as Record<string, string>))
          expect(c, kind).not.toBe('');
      } else if (k !== 'fontSizes') {
        expect(typeof v, k).toBe('string');
        expect(v, k).not.toBe('');
      }
    }
  });

  it('builds font shorthands with a pixel size and the mono family', () => {
    const t = readDiagramTheme(resolve);
    for (const f of [t.fontTitle, t.fontEyebrow, t.fontRow, t.fontChip]) {
      expect(f).toMatch(/^\d+\s+\d+(\.\d+)?px\s+Mono Test, monospace$/);
    }
    expect(t.fontRowItalic).toMatch(/^italic /);
  });

  it('reflects a token set on the element', () => {
    html().style.setProperty('--cy-color-surface', 'rgb(9, 8, 7)');
    expect(readDiagramTheme(resolve).card).toBe('rgb(9, 8, 7)');
    // A syntax token, once defined, wins over the last resort.
    html().style.setProperty('--cy-color-syntax-number', 'rgb(1, 2, 3)');
    expect(readDiagramTheme(resolve).value.number).toBe('rgb(1, 2, 3)');
  });
});
