import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LogoMark } from '../src/shared/ui/icons/brand/Logo';
import { TOOLS_ACCENT } from '../src/theme/tools-theme';

/**
 * The logo's fixed colours from tokens.css (the tile is dark in both themes,
 * so they are literal values there, not theme roles).
 */
export function logoToken(name: 'logo-tile' | 'logo-glyph'): string {
  const css = readFileSync('src/theme/tokens.css', 'utf8');
  const m = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})\\b`, 'i').exec(css);
  if (!m) throw new Error(`token --${name} not found`);
  return m[1];
}

/** LogoMark as a standalone SVG with literal colours. */
export function faviconSvg(): string {
  return `${renderToStaticMarkup(createElement(LogoMark, { size: 'xl' }))
    .replace(' aria-hidden="true"', '')
    .replace(' focusable="false"', '')
    .replace(/ class="shrink-0"/, '')
    .replace('class="fill-logo-tile"', `fill="${logoToken('logo-tile')}"`)
    .replace('class="fill-accent"', `fill="${TOOLS_ACCENT}"`)
    .replace(
      'class="stroke-logo-glyph"',
      `stroke="${logoToken('logo-glyph')}"`,
    )}\n`;
}
