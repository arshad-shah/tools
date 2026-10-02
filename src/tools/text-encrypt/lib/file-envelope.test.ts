import { describe, expect, it } from 'vitest';
import {
  checkFileSize,
  encryptedName,
  MAX_FILE_BYTES,
  packFile,
  unpackFile,
} from './file-envelope';

const GRIN = String.fromCodePoint(0x1f600);

describe('file envelope', () => {
  it('round-trips a Unicode name, the type and the bytes', async () => {
    const name = `r${String.fromCodePoint(0xe9)}sum${GRIN}.pdf`;
    const file = new File([new Uint8Array([1, 2, 3, 250])], name, {
      type: 'application/pdf',
    });
    const out = unpackFile(await packFile(file));
    expect(out.name).toBe(name);
    expect(out.mime).toBe('application/pdf');
    expect([...out.bytes]).toEqual([1, 2, 3, 250]);
  });
  it('keeps an empty type and empty contents', async () => {
    const out = unpackFile(await packFile(new File([], 'a')));
    expect(out).toMatchObject({ name: 'a', mime: '' });
    expect(out.bytes).toHaveLength(0);
  });
  it('refuses a truncated payload', async () => {
    const packed = await packFile(
      new File(['hello'], 'long-name.txt', { type: 'text/plain' }),
    );
    for (const cut of [1, 5, 16])
      expect(() => unpackFile(packed.subarray(0, cut))).toThrow(
        expect.objectContaining({ code: 'INVALID_INPUT' }),
      );
  });
  it('caps the size at 2 GB', () => {
    expect(() => checkFileSize(MAX_FILE_BYTES + 1)).toThrow(
      expect.objectContaining({ code: 'TOO_LARGE' }),
    );
    expect(() => checkFileSize(MAX_FILE_BYTES)).not.toThrow();
    expect(encryptedName('a.txt')).toBe('a.txt.enc');
  });
});
