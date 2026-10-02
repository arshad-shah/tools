import { describe, expect, it } from 'vitest';
import { windows1252Csv } from '../../../../test/fixtures/csv';
import { decodeBytes } from './decode';
import { parseDelimited } from './parse';

const EURO = String.fromCodePoint(0x20ac);
const E_ACUTE = String.fromCodePoint(0xe9);

describe('decodeBytes', () => {
  it('strips a UTF-8 BOM', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x61, 0x2c, 0x62]);
    expect(decodeBytes(bytes)).toEqual({ text: 'a,b', encoding: 'utf-8' });
  });

  it('detects UTF-16LE from its BOM', () => {
    const bytes = new Uint8Array([
      0xff, 0xfe, 0x61, 0x00, 0x2c, 0x00, 0x62, 0x00,
    ]);
    expect(decodeBytes(bytes)).toEqual({ text: 'a,b', encoding: 'utf-16le' });
  });

  it('detects UTF-16BE from its BOM', () => {
    const bytes = new Uint8Array([0xfe, 0xff, 0x00, 0x61, 0x00, 0x62]);
    expect(decodeBytes(bytes)).toEqual({ text: 'ab', encoding: 'utf-16be' });
  });

  it('reads valid UTF-8 without a BOM', () => {
    const bytes = new TextEncoder().encode(`caf${E_ACUTE}`);
    expect(decodeBytes(bytes)).toEqual({
      text: `caf${E_ACUTE}`,
      encoding: 'utf-8',
    });
  });

  it('falls back to Windows-1252 when the bytes are not UTF-8', () => {
    const bytes = new Uint8Array([0x80, 0x31, 0x30]);
    const r = decodeBytes(bytes);
    expect(r.encoding).toBe('windows-1252');
    expect(r.text).toBe(`${EURO}10`);
    expect(r.text.codePointAt(0)).toBe(0x20ac);
  });

  it('decodes explicit ISO-8859-1 byte for byte', () => {
    const bytes = new Uint8Array([0x80, 0xe9]);
    const r = decodeBytes(bytes, 'iso-8859-1');
    expect(r.encoding).toBe('iso-8859-1');
    expect(r.text.codePointAt(0)).toBe(0x80);
    expect(r.text.slice(1)).toBe(E_ACUTE);
  });

  it('honours an explicit encoding over detection', () => {
    const bytes = new TextEncoder().encode(E_ACUTE);
    expect(decodeBytes(bytes, 'windows-1252').text).toHaveLength(2);
  });

  it('reads the Windows-1252 fixture with the euro sign', () => {
    const { text, encoding } = decodeBytes(windows1252Csv());
    expect(encoding).toBe('windows-1252');
    const r = parseDelimited(text, 'auto');
    expect(r.delimiter).toBe(';');
    expect(r.data[0]).toEqual({ item: `Caf${E_ACUTE}`, price: `3,50 ${EURO}` });
  });
});
