import { describe, expect, it } from 'vitest';
import {
  insertSignature,
  locateAndPatchByteRange,
  pdfDate,
  pdfText,
  sigDictBytes,
  signedContent,
} from './byte-range';
import { concatBytes } from './syntax';

const enc = new TextEncoder();
const dec = new TextDecoder('latin1');

function fileWithSig() {
  return concatBytes([
    enc.encode('%PDF-1.7\n1 0 obj\n<< >>\nendobj\n'),
    sigDictBytes(7, {
      contentsBytes: 64,
      name: 'Jane (Doe)',
      reason: 'Approval',
      location: 'Dublin',
      m: new Date(2026, 9, 1, 12, 30, 5),
      subFilter: 'ETSI.CAdES.detached',
    }),
    enc.encode('trailer\n<< >>\n%%EOF\n'),
  ]);
}

describe('byte range', () => {
  it('writes the signature dictionary with placeholders', () => {
    const text = dec.decode(fileWithSig());
    expect(text).toContain('/Type /Sig /Filter /Adobe.PPKLite');
    expect(text).toContain('/SubFilter /ETSI.CAdES.detached');
    expect(text).toContain(`/Contents <${'0'.repeat(128)}>`);
    expect(text).toContain('/Name (Jane \\(Doe\\))');
    expect(text).toMatch(/\/M \(D:20261001123005[+-]\d\d'\d\d'\)/);
  });

  it('patches the ranges in place around the Contents value', () => {
    const file = fileWithSig();
    const before = file.length;
    const r = locateAndPatchByteRange(file);
    expect(file.length).toBe(before);
    expect(r.range[0]).toBe(0);
    expect(r.range[1]).toBe(r.contentsStart);
    expect(r.range[2]).toBe(r.contentsEnd);
    expect(r.range[1] + (r.contentsEnd - r.contentsStart) + r.range[3]).toBe(
      file.length,
    );
    expect(String.fromCharCode(file[r.contentsStart])).toBe('<');
    expect(String.fromCharCode(file[r.contentsEnd - 1])).toBe('>');
    const text = dec.decode(file);
    const m = /\/ByteRange \[0 (\d+) +(\d+) +(\d+) *\]/.exec(text)!;
    expect(m.slice(1).map(Number)).toEqual(r.range.slice(1));
    expect(signedContent(file, r).length).toBe(r.range[1] + r.range[3]);
  });

  it('inserts the DER as upper-case hex and refuses one too large', () => {
    const file = fileWithSig();
    const r = locateAndPatchByteRange(file);
    const out = insertSignature(file, r, Uint8Array.from([0xab, 0x01]));
    expect(out.length).toBe(file.length);
    expect(dec.decode(out.subarray(r.contentsStart, r.contentsStart + 6))).toBe(
      '<AB010',
    );
    expect(signedContent(out, r)).toEqual(signedContent(file, r));
    expect(() => insertSignature(file, r, new Uint8Array(65))).toThrow(
      'The signature did not fit in the space reserved for it',
    );
  });

  it('writes non-ASCII text as UTF-16BE and dates with an offset', () => {
    expect(pdfText('Zoe')).toBe('(Zoe)');
    expect(pdfText(`Zo${String.fromCodePoint(0xeb)}`)).toBe(
      '<FEFF005A006F00EB>',
    );
    expect(pdfDate(new Date(2026, 0, 2, 3, 4, 5))).toMatch(
      /^D:20260102030405[+-]\d\d'\d\d'$/,
    );
  });
});
