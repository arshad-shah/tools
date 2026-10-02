import { describe, expect, it } from 'vitest';
import { utf8Encode } from '../encoding';
import {
  bytesFrom,
  createDigest,
  digest,
  digestInfo,
  DIGESTS,
  HMAC_DIGEST_IDS,
  hmac,
  isDigestId,
  type DigestId,
} from './digest';

const te = utf8Encode;

describe('digest', () => {
  it.each<[string, DigestId, string]>([
    ['The quick brown fox jumps over the lazy dog', 'crc32', '414fa339'],
    [
      '',
      'blake3',
      'af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262',
    ],
    ['', 'xxhash64', 'ef46db3751d8e999'],
    [
      'abc',
      'blake2b-512',
      'ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923',
    ],
    [
      'abc',
      'blake2s-256',
      '508c5e8c327c14e2e1a72ba34eeb452f37458b209ed63a294d999b4c86675982',
    ],
    [
      'abc',
      'sha512-256',
      '53048e2681941ef99b2e29b76b4c7dabe4c2d0c634fc6d46e0e2f13107e7af23',
    ],
    ['', 'xxhash3', '2d06800538d394c2'],
    ['123456789', 'crc32c', 'e3069283'],
  ])('%j with %s', async (text, id, expected) => {
    await expect(digest(id, te(text))).resolves.toBe(expected);
  });

  it('streams in chunks to the same result', async () => {
    const all = te('a'.repeat(1000) + 'b'.repeat(777) + 'c');
    const d = await createDigest('sha256');
    d.update(all.subarray(0, 10));
    d.update(all.subarray(10, 1500));
    d.update(all.subarray(1500));
    expect(d.digestHex()).toBe(await digest('sha256', all));
  });

  it('lists every algorithm with its hex length', async () => {
    for (const info of DIGESTS) {
      const hex = await digest(info.id, te('x'));
      expect(hex).toHaveLength(info.hexLength);
    }
    expect(DIGESTS.find((d) => d.id === 'md5')?.broken).toBe(true);
    expect(DIGESTS.find((d) => d.id === 'crc32')?.nonCrypto).toBe(true);
  });

  it('computes HMAC (RFC 4231 case 2) and refuses checksums', async () => {
    await expect(
      hmac('sha256', te('Jefe'), te('what do ya want for nothing?')),
    ).resolves.toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
    await expect(hmac('crc32', te('k'), te('x'))).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  });

  it('refuses inherited object keys as ids with INVALID_INPUT', async () => {
    for (const id of [
      'toString',
      'constructor',
      '__proto__',
    ] as unknown as DigestId[]) {
      await expect(digest(id, te('x'))).rejects.toMatchObject({
        code: 'INVALID_INPUT',
      });
      await expect(createDigest(id)).rejects.toMatchObject({
        code: 'INVALID_INPUT',
      });
      await expect(hmac(id, te('k'), te('x'))).rejects.toMatchObject({
        code: 'INVALID_INPUT',
      });
    }
  });
});

describe('digest helpers', () => {
  it('bytesFrom reads text, hex and Base64', () => {
    expect([...bytesFrom('hi', 'text')]).toEqual([0x68, 0x69]);
    expect([...bytesFrom('0x00 FF', 'hex')]).toEqual([0, 255]);
    expect([...bytesFrom('AP8=', 'base64')]).toEqual([0, 255]);
    expect(() => bytesFrom('abc', 'hex')).toThrow(/The input is not valid hex/);
    expect(() => bytesFrom('*', 'base64', 'The message')).toThrow(
      /The message is not valid Base64/,
    );
  });
  it('digestInfo and the HMAC list', () => {
    expect(digestInfo('sha256').hexLength).toBe(64);
    expect(HMAC_DIGEST_IDS).toContain('blake3');
    expect(HMAC_DIGEST_IDS).not.toContain('crc32');
    expect(isDigestId('md5')).toBe(true);
    expect(isDigestId('nope')).toBe(false);
  });
});
