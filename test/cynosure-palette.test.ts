import { createTheme, themeToCss } from '@arshad-shah/cynosure';
import { describe, expect, it } from 'vitest';
import { cynosureThemeCss } from '../scripts/gen-cynosure-theme';

/*
 * Redesign spec, rule 4: the tools theme is Cynosure's own palette, type
 * scale and spacing from the tools accent; only the font is Cynosure's
 * self-hosted Hanken Grotesk.
 */
const css = cynosureThemeCss();
const own = themeToCss(createTheme({ accent: '#3ddc97' }));
const role = (text: string, name: string) =>
  new RegExp(`--cy-color-${name}:([^;}]+)`).exec(text)?.[1];

describe('tools theme', () => {
  it.each([
    'bg',
    'surface',
    'surface-raised',
    'soft',
    'line',
    'ink',
    'muted',
    'accent',
    'accent-text',
    'danger-text',
  ])("%s is Cynosure's own for the accent", (name) => {
    expect(role(css, name)).toBe(role(own, name));
  });

  it('keeps the tools accent and uses Hanken Grotesk', () => {
    expect(role(css, 'accent')).toBe('#3ddc97');
    expect(css).toContain('--cy-font-sans:"Hanken Grotesk"');
  });
});
