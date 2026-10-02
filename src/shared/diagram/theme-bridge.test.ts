/**
 * Ported from arshad-shah/verql tests/unit/er/erd-theme-bridge.test.ts
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 */
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readThemeTokens } from '@/shared/lib/theme-tokens';
import { readDiagramTheme, watchTheme } from './theme-bridge';

const html = () => document.documentElement;
// Token values are opaque strings to the bridge; rgb() keeps them obviously
// test data.
const TOKENS: Record<string, string> = {
  '--canvas': 'rgb(1, 1, 1)',
  '--surface': 'rgb(2, 2, 2)',
  '--surface-2': 'rgb(3, 3, 3)',
  '--surface-3': 'rgb(4, 4, 4)',
  '--line': 'rgb(5, 5, 5)',
  '--line-strong': 'rgb(6, 6, 6)',
  '--line-control': 'rgb(7, 7, 7)',
  '--fg': 'rgb(8, 8, 8)',
  '--fg-muted': 'rgb(9, 9, 9)',
  '--fg-subtle': 'rgb(10, 10, 10)',
  '--accent': 'rgb(11, 11, 11)',
  '--accent-fg': 'rgb(12, 12, 12)',
  '--accent-soft': 'rgb(13, 13, 13)',
  '--focus': 'rgb(14, 14, 14)',
  '--info': 'rgb(15, 15, 15)',
  '--warning': 'rgb(16, 16, 16)',
  '--warning-soft': 'rgb(17, 17, 17)',
  '--font-mono': 'Mono Test, monospace',
};

beforeEach(() => {
  for (const [k, v] of Object.entries(TOKENS)) html().style.setProperty(k, v);
});
afterEach(() => {
  html().removeAttribute('style');
  html().removeAttribute('data-theme');
});

describe('readDiagramTheme', () => {
  it('returns every field as a non-empty string', () => {
    const t = readDiagramTheme();
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
    const t = readDiagramTheme();
    for (const f of [t.fontTitle, t.fontEyebrow, t.fontRow, t.fontChip]) {
      expect(f).toMatch(/^\d+\s+\d+(\.\d+)?px\s+Mono Test, monospace$/);
    }
    expect(t.fontRowItalic).toMatch(/^italic /);
  });

  it('reflects a token set on the element', () => {
    html().style.setProperty('--surface', 'rgb(9, 8, 7)');
    expect(readDiagramTheme().card).toBe('rgb(9, 8, 7)');
    // A syntax token, once defined, wins over its fallback.
    html().style.setProperty('--color-syntax-number', 'rgb(1, 2, 3)');
    expect(readDiagramTheme().value.number).toBe('rgb(1, 2, 3)');
  });

  it('reads tokens by short name, prefixed name or raw property', () => {
    html().style.setProperty('--color-chart-1', 'rgb(4, 5, 6)');
    expect(readThemeTokens(['surface', 'chart-1', '--fg', 'nope'])).toEqual({
      surface: 'rgb(2, 2, 2)',
      'chart-1': 'rgb(4, 5, 6)',
      '--fg': 'rgb(8, 8, 8)',
      nope: '',
    });
  });
});

describe('watchTheme', () => {
  it('fires on a data-theme change and stops after unsubscribe', async () => {
    const cb = vi.fn();
    const stop = watchTheme(cb);
    html().setAttribute('data-theme', 'light');
    await new Promise((r) => setTimeout(r, 0));
    expect(cb).toHaveBeenCalledTimes(1);
    stop();
    html().setAttribute('data-theme', 'dark');
    await new Promise((r) => setTimeout(r, 0));
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
