import { describe, expect, it } from 'vitest';
import { missingChars } from './fonts';

describe('missingChars', () => {
  it('lists each character the font has no glyph for, once, ignoring whitespace', () => {
    const has = (cp: number) => cp < 0x100;
    expect(missingChars('Ada Lovelace', has)).toEqual([]);
    expect(missingChars('Łukasz Łoś\t', has)).toEqual(['Ł', 'ś']);
  });
});
