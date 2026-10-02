import { describe, expect, it } from 'vitest';
import { clean } from './clean';

const e = String.fromCodePoint(0xe9);

describe('clean', () => {
  it('collapses whitespace per line', () => {
    expect(clean.collapseWhitespace('  a   b\t c \nd  e')).toBe('a b c\nd e');
  });
  it('converts tabs and spaces', () => {
    expect(clean.tabsToSpaces('\ta\t', 4)).toBe('    a    ');
    expect(clean.spacesToTabs('    a\n   b', 2)).toBe('\t\ta\n\t b');
  });
  it('removes diacritics', () => {
    expect(
      clean.removeDiacritics(`caf${e} na${String.fromCodePoint(0xef)}ve`),
    ).toBe('cafe naive');
  });
  it('strips non-printable characters but keeps newlines and tabs', () => {
    const zwsp = String.fromCodePoint(0x200b);
    expect(clean.stripNonPrintable(`a\u0000b${zwsp}c\n\td`)).toBe('abc\n\td');
  });
  it('normalises line endings', () => {
    expect(clean.normaliseLineEndings('a\r\nb\rc\nd', 'lf')).toBe('a\nb\nc\nd');
    expect(clean.normaliseLineEndings('a\nb\r\nc', 'crlf')).toBe('a\r\nb\r\nc');
  });
  it('normalises Unicode (NFC is shorter than NFD)', () => {
    const composed = `caf${e}`;
    expect(clean.normaliseUnicode(composed, 'NFD')).toHaveLength(5);
    expect(
      clean.normaliseUnicode(clean.normaliseUnicode(composed, 'NFD'), 'NFC'),
    ).toHaveLength(4);
  });
});
