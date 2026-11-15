import { describe, expect, it } from 'vitest';
import { cynosureThemeCss } from '../scripts/gen-cynosure-theme';

/*
 * The Cynosure theme is built from tools' own palette (tools#104, owner's
 * call 2026-11-15): Cynosure components show tools' cool neutrals, ink and
 * accent in both modes, not Cynosure's defaults.
 */
const css = cynosureThemeCss();
const role = (name: string) =>
  new RegExp(`--cy-color-${name}:([^;}]+)`).exec(css)?.[1];

describe('Cynosure theme from the tools palette', () => {
  it.each([
    ['bg', 'light-dark(#f6f7f9,#0c0e12)'],
    ['surface', 'light-dark(#ffffff,#12151b)'],
    ['surface-raised', 'light-dark(#f1f3f6,#171b22)'],
    ['soft', 'light-dark(#e7eaef,#1e232c)'],
    ['line', 'light-dark(#e0e4ea,#232934)'],
    ['ink', 'light-dark(#0f1419,#e8ebf0)'],
    ['muted', 'light-dark(#4a5363,#a3abba)'],
    ['accent-text', 'light-dark(#0b794f,#3ddc97)'],
    ['ring', 'light-dark(#0b794f,#3ddc97)'],
    ['danger-text', 'light-dark(#c02727,#f87171)'],
    ['warning-text', 'light-dark(#975600,#fbbf24)'],
    ['info-text', 'light-dark(#1d5fc4,#60a5fa)'],
  ])('%s is %s', (name, value) => {
    expect(role(name)).toBe(value);
  });

  it('keeps the tools accent and fonts', () => {
    expect(role('accent')).toMatch(/#3ddc97/);
    expect(css).toContain("'Inter Variable'");
    expect(css).toContain("'JetBrains Mono Variable'");
  });
});
