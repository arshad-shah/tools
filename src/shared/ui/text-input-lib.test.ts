import { describe, expect, it } from 'vitest';
import {
  codePointCount,
  decodeText,
  lineCount,
  utf8Length,
} from './text-input-lib';

describe('text-input-lib', () => {
  it('counts UTF-8 bytes, code points and lines', () => {
    const smile = String.fromCodePoint(0x1f600);
    expect(utf8Length(`a${smile}é€`)).toBe(1 + 4 + 2 + 3);
    expect(utf8Length(`a${smile}é€`)).toBe(
      new TextEncoder().encode(`a${smile}é€`).length,
    );
    expect(codePointCount(`a${smile}`)).toBe(2);
    expect(lineCount('')).toBe(1);
    expect(lineCount('a\nb\nc')).toBe(3);
  });

  it('decodes each encoding', () => {
    const b = new Uint8Array([0x80, 0x41]);
    expect(decodeText(b, 'windows-1252', 'f').codePointAt(0)).toBe(0x20ac);
    expect(decodeText(b, 'iso-8859-1', 'f').codePointAt(0)).toBe(0x80);
    expect(
      decodeText(new Uint8Array([0x41, 0, 0x42, 0]), 'utf-16le', 'f'),
    ).toBe('AB');
  });

  it('refuses binary data and invalid UTF-8', () => {
    expect(() =>
      decodeText(new Uint8Array([0x41, 0]), 'utf-8', 'x.bin'),
    ).toThrow(/binary/);
    expect(decodeText(new Uint8Array([0x41, 0]), 'utf-8', 'x', true)).toBe(
      'A\u0000',
    );
    expect(() => decodeText(new Uint8Array([0xff]), 'utf-8', 'x')).toThrow(
      /not valid UTF-8/,
    );
  });
});
