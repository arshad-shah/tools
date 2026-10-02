import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LogoMark } from '../src/shared/ui/icons/brand/Logo';

/** Dark-theme token values from tokens.css (the favicon tile is always dark). */
export function darkToken(name: string): string {
  const css = readFileSync('src/theme/tokens.css', 'utf8');
  const start = css.indexOf(":root[data-theme='dark']");
  const body = css.slice(start, css.indexOf('}', start));
  const m = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})\\b`, 'i').exec(body);
  if (!m) throw new Error(`token --${name} not found`);
  return m[1];
}

/** LogoMark as a standalone SVG with literal colours. */
export function faviconSvg(): string {
  return `${renderToStaticMarkup(createElement(LogoMark, { size: 'xl' }))
    .replace(' aria-hidden="true"', '')
    .replace(' focusable="false"', '')
    .replace(/ class="shrink-0"/, '')
    .replace('class="fill-logo-tile"', `fill="${darkToken('logo-tile')}"`)
    .replace('class="fill-accent"', `fill="${darkToken('accent')}"`)
    .replace(
      'class="stroke-logo-glyph"',
      `stroke="${darkToken('logo-glyph')}"`,
    )}\n`;
}
