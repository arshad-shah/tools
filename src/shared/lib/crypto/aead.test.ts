import { describe, expect, it } from 'vitest';
import { utf8Decode, utf8Encode } from '../encoding';
import { armor, dearmor, open, seal, type KdfParams } from './aead';

const FAST: KdfParams = { kind: 'pbkdf2', iterations: 1000 };
const ARGON: KdfParams = {
  kind: 'argon2id',
  memoryKiB: 1024,
  iterations: 1,
  parallelism: 1,
};
const msg = utf8Encode('attack at dawn');

describe('aead envelope', () => {
  it.each([
    ['PBKDF2', FAST],
    ['Argon2id', ARGON],
  ])('round-trips with %s', async (_, kdf) => {
    const sealed = await seal(msg, 'correct horse', kdf);
    expect(utf8Decode(sealed.subarray(0, 4))).toBe('TENC');
    expect(sealed[4]).toBe(1);
    expect(sealed[5]).toBe(kdf.kind === 'pbkdf2' ? 1 : 2);
    expect(utf8Decode(await open(sealed, 'correct horse'))).toBe(
      'attack at dawn',
    );
  });

  it('rejects a wrong passphrase', async () => {
    const sealed = await seal(msg, 'right', FAST);
    await expect(open(sealed, 'wrong')).rejects.toMatchObject({
      code: 'WRONG_PASSWORD',
      message: 'Wrong passphrase, or the data was changed',
    });
  });

  it('detects a changed ciphertext or header byte', async () => {
    const sealed = await seal(msg, 'pw', FAST);
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
    const sealed = await seal(msg, 'pw', FAST);
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

  it('refuses KDF settings a crafted file could abuse', async () => {
    const sealed = await seal(msg, 'pw', FAST);
    const huge = sealed.slice();
    new DataView(huge.buffer).setUint32(6, 0xffffffff);
    await expect(open(huge, 'pw')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  });

  it('seals the same input differently each time', async () => {
    const a = await seal(msg, 'pw', FAST);
    const b = await seal(msg, 'pw', FAST);
    expect(a).not.toEqual(b);
  });

  it('armours with the exact BEGIN and END lines and 76 columns', async () => {
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
