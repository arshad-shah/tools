import { beforeAll, describe, expect, it } from 'vitest';
import { utf8Decode, utf8Encode } from '../encoding';
import {
  armor,
  dearmor,
  DEFAULT_KDF,
  open,
  seal,
  type KdfParams,
} from './aead';

// The OWASP minimum for Argon2id (7 MiB, 5 passes), cheapest that seal takes.
const ARGON: KdfParams = {
  kind: 'argon2id',
  memoryKiB: 7168,
  iterations: 5,
  parallelism: 1,
};
const msg = utf8Encode('attack at dawn');

const hex = (h: string) =>
  Uint8Array.from(h.match(/../g)!.map((b) => parseInt(b, 16)));

/** An envelope header followed by enough bytes to look complete. */
function forged(kdfId: number, params: number[]): Uint8Array {
  return Uint8Array.from([
    ...utf8Encode('TENC'),
    1,
    kdfId,
    ...params,
    ...new Array(16 + 12 + 32).fill(7),
  ]);
}
const u32 = (n: number) => [
  (n >>> 24) & 255,
  (n >>> 16) & 255,
  (n >>> 8) & 255,
  n & 255,
];

let sealed: Uint8Array;
beforeAll(async () => {
  sealed = await seal(msg, 'pw', DEFAULT_KDF);
});

describe('aead envelope', () => {
  it('opens a frozen known-answer envelope (made with node:crypto)', async () => {
    // PBKDF2-SHA-256 600,000, salt 00..0f, IV a0..ab.
    const kat = hex(
      '54454e430101000927c0000102030405060708090a0b0c0d0e0fa0a1a2a3a4a5a6a7a8a9aaabdf01dcec0818a0865407648324fe63dc8f30cf54976ffed02997a06a06a31cb27f8c00b520ea0344b0',
    );
    expect(utf8Decode(await open(kat, 'correct horse battery staple'))).toBe(
      'tools-enc-v1 known answer',
    );
  });

  it('round-trips with PBKDF2', async () => {
    expect(utf8Decode(sealed.subarray(0, 4))).toBe('TENC');
    expect([sealed[4], sealed[5]]).toEqual([1, 1]);
    expect(utf8Decode(await open(sealed, 'pw'))).toBe('attack at dawn');
  });

  it('round-trips with Argon2id', async () => {
    const a = await seal(msg, 'correct horse', ARGON);
    expect(a[5]).toBe(2);
    expect(utf8Decode(await open(a, 'correct horse'))).toBe('attack at dawn');
  });

  it('refuses weak KDF settings when sealing', async () => {
    for (const kdf of [
      { kind: 'pbkdf2', iterations: 599_999 },
      { kind: 'argon2id', memoryKiB: 1024, iterations: 1, parallelism: 1 },
      { kind: 'argon2id', memoryKiB: 7168, iterations: 4, parallelism: 1 },
    ] as KdfParams[])
      await expect(seal(msg, 'pw', kdf)).rejects.toMatchObject({
        code: 'INVALID_INPUT',
      });
  });

  it('refuses costly KDF headers before deriving anything', async () => {
    const worst = [
      forged(2, [...u32(0xffffffff), 255, 255]),
      forged(2, [...u32(262_145), 1, 1]),
      forged(2, [...u32(262_144), 10, 1]), // memory x passes over 1 GiB
      forged(2, [...u32(131_072), 11, 1]),
      forged(1, u32(0xffffffff)),
      forged(1, u32(0)),
    ];
    for (const env of worst) {
      const t0 = performance.now();
      await expect(open(env, 'pw')).rejects.toMatchObject({
        code: 'INVALID_INPUT',
      });
      expect(performance.now() - t0).toBeLessThan(50);
    }
  });

  it('stops when aborted', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      open(sealed, 'pw', { signal: ctrl.signal }),
    ).rejects.toMatchObject({ code: 'CANCELLED' });
    await expect(
      seal(msg, 'pw', ARGON, { signal: ctrl.signal }),
    ).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('rejects a wrong passphrase', async () => {
    await expect(open(sealed, 'wrong')).rejects.toMatchObject({
      code: 'WRONG_PASSWORD',
      message: 'Wrong passphrase, or the data was changed',
    });
  });

  it('detects a changed ciphertext or header byte', async () => {
    const body = sealed.slice();
    body[body.length - 20] ^= 1;
    await expect(open(body, 'pw')).rejects.toMatchObject({
      code: 'WRONG_PASSWORD',
    });
    // Byte 12 is inside the salt: part of the authenticated header.
    const header = sealed.slice();
    header[12] ^= 1;
    await expect(open(header, 'pw')).rejects.toMatchObject({
      code: 'WRONG_PASSWORD',
    });
    // An iteration count changed in the header (still in range).
    const iters = sealed.slice();
    iters[9] ^= 1;
    await expect(open(iters, 'pw')).rejects.toMatchObject({
      code: 'WRONG_PASSWORD',
    });
  });

  it('refuses a foreign magic and an unknown version', async () => {
    const magic = sealed.slice();
    magic[0] = 0x58;
    await expect(open(magic, 'pw')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    const version = sealed.slice();
    version[4] = 2;
    await expect(open(version, 'pw')).rejects.toMatchObject({
      code: 'UNSUPPORTED_FEATURE',
    });
    await expect(open(sealed.slice(0, 20), 'pw')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  });

  it('seals the same input differently each time', async () => {
    const again = await seal(msg, 'pw', DEFAULT_KDF);
    expect(again).not.toEqual(sealed);
  });

  it('armours with the exact BEGIN and END lines and 76 columns', () => {
    const bytes = crypto.getRandomValues(new Uint8Array(500));
    const text = armor(bytes);
    const lines = text.trimEnd().split('\n');
    expect(lines[0]).toBe('-----BEGIN TOOLS ENCRYPTED MESSAGE-----');
    expect(lines[lines.length - 1]).toBe(
      '-----END TOOLS ENCRYPTED MESSAGE-----',
    );
    for (const l of lines.slice(1, -1))
      expect(l.length).toBeLessThanOrEqual(76);
    expect([...dearmor(`Hi\n${text}\nbye`)]).toEqual([...bytes]);
    expect(() => dearmor('no armour')).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
    expect(() =>
      dearmor(
        '-----BEGIN TOOLS ENCRYPTED MESSAGE-----\n%%%\n-----END TOOLS ENCRYPTED MESSAGE-----',
      ),
    ).toThrow(/damaged/);
  });
});
