import { describe, expect, it, vi } from 'vitest';

// Each font file is imported only when its load() runs.
const imported = vi.hoisted(() => ({ kristi: 0, caveat: 0 }));
vi.mock('@fontsource/kristi/files/kristi-latin-400-normal.woff?url', () => {
  imported.kristi += 1;
  return { default: '/assets/kristi.woff' };
});
vi.mock('@fontsource/caveat/files/caveat-latin-400-normal.woff?url', () => {
  imported.caveat += 1;
  return { default: '/assets/caveat.woff' };
});

const { missingChars, SIGNATURE_FONTS, fontById } = await import('./fonts');

describe('SIGNATURE_FONTS', () => {
  it('registers ten fonts with unique ids and families', () => {
    expect(SIGNATURE_FONTS).toHaveLength(10);
    expect(new Set(SIGNATURE_FONTS.map((f) => f.id)).size).toBe(10);
    expect(new Set(SIGNATURE_FONTS.map((f) => f.family)).size).toBe(10);
    expect(SIGNATURE_FONTS.map((f) => f.id)).toEqual([
      'dancing-script',
      'great-vibes',
      'caveat',
      'sacramento',
      'allura',
      'alex-brush',
      'parisienne',
      'pinyon-script',
      'mr-dafoe',
      'kristi',
    ]);
  });

  it('fetches nothing at import time; load() resolves the file URL', async () => {
    expect(imported).toEqual({ kristi: 0, caveat: 0 });
    expect(await fontById('kristi').load()).toBe('/assets/kristi.woff');
    expect(imported).toEqual({ kristi: 1, caveat: 0 });
    expect(await fontById('caveat').load()).toBe('/assets/caveat.woff');
    expect(imported.caveat).toBe(1);
  });
});

describe('missingChars', () => {
  it('lists each character the font has no glyph for, once, ignoring whitespace', () => {
    const has = (cp: number) => cp < 0x100;
    expect(missingChars('Ada Lovelace', has)).toEqual([]);
    expect(missingChars('Łukasz Łoś\t', has)).toEqual(['Ł', 'ś']);
  });
});
