import { describe, expect, it } from 'vitest';
import { matchExpected, normalizeExpected } from './verify';

const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const MD5_ABC = '900150983cd24fb0d6963f7d28e17f72';

describe('matchExpected', () => {
  it('ignores case, whitespace and an algorithm prefix', () => {
    expect(
      matchExpected(`SHA256: ${ABC.toUpperCase()}`, {
        sha256: ABC,
        md5: MD5_ABC,
      }),
    ).toEqual({ match: 'sha256', candidates: ['sha256'] });
  });
  it('lists candidates by length when nothing matches', () => {
    expect(
      matchExpected('0'.repeat(32), { sha256: ABC, md5: MD5_ABC }),
    ).toEqual({ match: null, candidates: ['md5'] });
  });
  it('reads sha256sum lines and Base64', () => {
    expect(normalizeExpected(`${ABC}  file.txt`)).toBe(ABC);
    expect(normalizeExpected('AP8=')).toBe('00ff');
    expect(normalizeExpected('not a hash!')).toBeNull();
  });
});
