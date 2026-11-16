import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LogoMark } from '../src/shared/surfaces/logo/LogoMark';
import { TOOLS_ACCENT } from '../src/theme/tools-theme';

/** LogoMark as a standalone SVG with literal colours (no stylesheet). */
export function faviconSvg(): string {
  return `${renderToStaticMarkup(createElement(LogoMark, { size: 24 }))
    .replace(' aria-hidden="true"', '')
    .replace(' focusable="false"', '')
    .replace('fill="var(--cy-color-accent)"', `fill="${TOOLS_ACCENT}"`)}\n`;
}
