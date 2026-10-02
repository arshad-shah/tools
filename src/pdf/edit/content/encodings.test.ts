import { describe, expect, it } from 'vitest';
import { macRomanTable, winAnsiTable } from './encodings';

describe('macRomanTable', () => {
  const t = macRomanTable();

  it('keeps the ASCII range with the Mac quote and grave', () => {
    expect(t.get(0x41)).toBe('A');
    expect(t.get(0x27)).toBe('quotesingle');
    expect(t.get(0x60)).toBe('grave');
  });

  it('names the codes above 127 as PDF 32000-1 Annex D does', () => {
    for (const [code, glyph] of [
      [0x80, 'Adieresis'],
      [0x87, 'aacute'],
      [0xa0, 'dagger'],
      [0xa5, 'bullet'],
      [0xa7, 'germandbls'],
      [0xaa, 'trademark'],
      [0xc4, 'florin'],
      [0xca, 'space'],
      [0xd5, 'quoteright'],
      [0xd9, 'Ydieresis'],
      [0xda, 'fraction'],
      [0xdb, 'currency'],
      [0xde, 'fi'],
      [0xdf, 'fl'],
      [0xe4, 'perthousand'],
      [0xf5, 'dotlessi'],
      [0xf6, 'circumflex'],
      [0xfb, 'ring'],
      [0xfd, 'hungarumlaut'],
      [0xff, 'caron'],
    ] as const)
      expect(t.get(code), code.toString(16)).toBe(glyph);
  });

  it('leaves out the Mac OS symbols PDF MacRomanEncoding lacks', () => {
    for (const code of [0xad, 0xb0, 0xb2, 0xb9, 0xbd, 0xc3, 0xd7, 0xf0])
      expect(t.get(code), code.toString(16)).toBeUndefined();
    const high = [...t.keys()].filter((c) => c > 127);
    expect(high).toHaveLength(128 - 15);
  });

  it('keeps WinAnsi and names its code 159 Ydieresis', () => {
    expect(winAnsiTable().get(0x80)).toBe('Euro');
    expect(winAnsiTable().get(0x9f)).toBe('Ydieresis');
    expect(winAnsiTable().get(0xff)).toBe('ydieresis');
  });
});
