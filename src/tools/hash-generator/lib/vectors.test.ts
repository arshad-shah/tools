import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ALGORITHMS,
  HMAC_ALGORITHMS,
  computeHmac,
  computeHash,
  parseKey,
} from '@/shared/lib/crypto/digest';

describe('computeHash', () => {
  it('hashes raw bytes as they are (files), text as UTF-8', () => {
    const bytes = new Uint8Array([0xff, 0x00, 0x61]);
    expect(computeHash('sha256', bytes)).toBe(
      createHash('sha256').update(Buffer.from(bytes)).digest('hex'),
    );
    expect(computeHash('sha256', 'abc')).toBe(
      computeHash('sha256', new TextEncoder().encode('abc')),
    );
  });

  // FIPS 202 / NIST CSRC examples for the message "abc".
  it.each([
    ['sha3-224', 'e642824c3f8cf24ad09234ee7d3c766fc9a3a5168d0c94ad73b46fdf'],
    [
      'sha3-256',
      '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532',
    ],
    [
      'sha3-384',
      'ec01498288516fc926459f58e2c6ad8df9b473cb0fc08c2596da7cf0e49be4b298d88cea927ac7f539f1edf228376d25',
    ],
    [
      'sha3-512',
      'b751850b1a57168a5693cd924b6b096e08f621827444f70d884f5d0240d2712e10e116e9192af3c91a7ec57647e3934057340b4cf408d5a56592f8274eec53f0',
    ],
  ])('%s matches the FIPS 202 vector for "abc"', (id, expected) => {
    expect(computeHash(id, 'abc')).toBe(expected);
  });

  it('labels Keccak-256 separately and uses the pre-standard padding', () => {
    expect(ALGORITHMS.find((a) => a.id === 'keccak-256')?.name).toBe(
      'Keccak-256 (Ethereum)',
    );
    // Ethereum's well-known Keccak-256 of the empty string.
    expect(computeHash('keccak-256', '')).toBe(
      'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
    );
    expect(computeHash('keccak-256', 'abc')).not.toBe(
      computeHash('sha3-256', 'abc'),
    );
  });

  it('never offers an unqualified "SHA-3"', () => {
    expect(ALGORITHMS.map((a) => a.name)).not.toContain('SHA-3');
  });

  it.each(['md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512', 'ripemd160'])(
    '%s agrees with node:crypto on UTF-8 input',
    (id) => {
      const text = 'café €';
      expect(computeHash(id, text)).toBe(
        createHash(id).update(text, 'utf8').digest('hex'),
      );
    },
  );

  it('sha3 variants agree with node:crypto', () => {
    for (const bits of [224, 256, 384, 512]) {
      expect(computeHash(`sha3-${bits}`, 'héllo')).toBe(
        createHash(`sha3-${bits}`).update('héllo', 'utf8').digest('hex'),
      );
    }
  });
});

describe('computeHmac', () => {
  // RFC 4231 test case 1: key = 0x0b * 20, data = "Hi There".
  const tc1Key = parseKey('0b'.repeat(20), 'hex');
  it('matches RFC 4231 test case 1', () => {
    expect(computeHmac('hmac-sha256', tc1Key, 'Hi There')).toBe(
      'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    );
    expect(computeHmac('hmac-sha384', tc1Key, 'Hi There')).toBe(
      'afd03944d84895626b0825f4ab46907f15f9dadbe4101ec682aa034c7cebc59cfaea9ea9076ede7f4af152e8b2fa9cb6',
    );
    expect(computeHmac('hmac-sha512', tc1Key, 'Hi There')).toBe(
      '87aa7cdea5ef619d4ff0b4241a1d6cb02379f4e2ce4ec2787ad0b30545e17cdedaa833b7d6b8a702038b274eaea3f4e4be9d914eeb61f1702e696c203a126854',
    );
  });

  // RFC 4231 test case 2 / RFC 2202: key = "Jefe".
  it('matches RFC 4231 / RFC 2202 test case 2 with a text key', () => {
    const key = parseKey('Jefe', 'text');
    const data = 'what do ya want for nothing?';
    expect(computeHmac('hmac-sha256', key, data)).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
    expect(computeHmac('hmac-md5', key, data)).toBe(
      '750c783e6ab0b503eaa86e310a5db738',
    );
    expect(computeHmac('hmac-sha1', key, data)).toBe(
      'effcdf6ae5eb2fa2d27416d5f184df9c259a7c79',
    );
  });

  it('uses the given key, not a fixed one', () => {
    const a = computeHmac('hmac-sha256', parseKey('one', 'text'), 'msg');
    const b = computeHmac('hmac-sha256', parseKey('two', 'text'), 'msg');
    expect(a).not.toBe(b);
    expect(a).toBe(createHmac('sha256', 'one').update('msg').digest('hex'));
  });

  it('covers every HMAC algorithm against node:crypto', () => {
    const node: Record<string, string> = {
      'hmac-md5': 'md5',
      'hmac-sha1': 'sha1',
      'hmac-sha256': 'sha256',
      'hmac-sha384': 'sha384',
      'hmac-sha512': 'sha512',
      'hmac-sha3-256': 'sha3-256',
    };
    for (const a of HMAC_ALGORITHMS) {
      expect(computeHmac(a.id, parseKey('k€y', 'text'), 'data')).toBe(
        createHmac(node[a.id], 'k€y').update('data').digest('hex'),
      );
    }
  });
});

describe('empty message', () => {
  it('hashes the empty string to the published digests', () => {
    expect(computeHash('sha256', '')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(computeHash('sha3-256', '')).toBe(
      'a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a',
    );
    expect(computeHmac('hmac-sha256', parseKey('key', 'text'), '')).toBe(
      createHmac('sha256', 'key').update('').digest('hex'),
    );
  });
});

describe('parseKey', () => {
  it('accepts hex with whitespace and either case', () => {
    expect(Buffer.from(parseKey('0B 0b\n0B', 'hex')).toString('hex')).toBe(
      '0b0b0b',
    );
  });

  it('rejects invalid hex with a ToolError', () => {
    expect(() => parseKey('abc', 'hex')).toThrow(/hex/i);
    expect(() => parseKey('zz', 'hex')).toThrow(/hex/i);
  });
});
