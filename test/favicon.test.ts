import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { faviconSvg } from '../scripts/favicon';

describe('public/favicon.svg', () => {
  it('matches a fresh render of LogoMark with token colours', () => {
    const svg = faviconSvg();
    expect(svg).not.toContain('class=');
    expect(
      readFileSync('public/favicon.svg', 'utf8').replace(/\r\n/g, '\n'),
    ).toBe(svg);
  });
});
