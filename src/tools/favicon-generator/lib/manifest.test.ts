import { describe, expect, it } from 'vitest';
import { buildManifest, htmlSnippet } from './manifest';

describe('buildManifest', () => {
  it('is valid JSON with the 192, 512 and maskable icons', () => {
    const m = JSON.parse(
      buildManifest({
        name: 'Tools',
        shortName: 'T',
        themeColor: '#112233',
        backgroundColor: '#ffffff',
      }),
    ) as {
      name: string;
      short_name: string;
      theme_color: string;
      background_color: string;
      icons: { src: string; sizes: string; purpose?: string }[];
    };
    expect(m.name).toBe('Tools');
    expect(m.short_name).toBe('T');
    expect(m.theme_color).toBe('#112233');
    expect(m.background_color).toBe('#ffffff');
    expect(m.icons.map((i) => i.sizes)).toEqual([
      '192x192',
      '512x512',
      '512x512',
    ]);
    expect(m.icons[2]).toMatchObject({
      src: '/icon-maskable-512.png',
      purpose: 'maskable',
    });
  });

  it('falls back to sensible names', () => {
    const m = JSON.parse(
      buildManifest({
        name: ' ',
        shortName: '',
        themeColor: '#000000',
        backgroundColor: '#ffffff',
      }),
    ) as { name: string; short_name: string };
    expect(m.name).toBe('My app');
    expect(m.short_name).toBe('App');
  });
});

describe('htmlSnippet', () => {
  it('links the ICO, the SVG, the Apple touch icon and the manifest', () => {
    const s = htmlSnippet();
    expect(s).toContain('<link rel="icon" href="/favicon.ico"');
    expect(s).toContain(
      '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    );
    expect(s).toContain('rel="apple-touch-icon"');
    expect(s).toContain('rel="manifest"');
    expect(htmlSnippet({ svg: false })).not.toContain('favicon.svg');
  });
});
