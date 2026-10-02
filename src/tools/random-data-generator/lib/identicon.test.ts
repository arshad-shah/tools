import { describe, expect, it } from 'vitest';
import { identiconSvgDataUri } from './identicon';

describe('identiconSvgDataUri', () => {
  it('is a local SVG data URI', () => {
    const uri = identiconSvgDataUri('ada');
    expect(uri.startsWith('data:image/svg+xml,')).toBe(true);
    const svg = decodeURIComponent(uri.slice('data:image/svg+xml,'.length));
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });

  it('is the same for the same seed and differs for another', () => {
    expect(identiconSvgDataUri('ada')).toBe(identiconSvgDataUri('ada'));
    expect(identiconSvgDataUri('ada')).not.toBe(identiconSvgDataUri('bob'));
  });
});
