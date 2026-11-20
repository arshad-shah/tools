import { describe, expect, it } from 'vitest';
import {
  base64ToBytes,
  bytesToBase64,
  utf8Decode,
} from '@/shared/lib/encoding';
import {
  readSshFields,
  sshFingerprint,
  sshKeygenLine,
  sshMpint,
  sshPublicKey,
  sshPublicLine,
  sshString,
} from './ssh';

const b64url = (b: Uint8Array) =>
  bytesToBase64(b, { urlSafe: true, padding: false });
const bytes = (...v: number[]) => Uint8Array.from(v);

describe('RFC 4251 encodings', () => {
  it('writes a string as a uint32 length and the bytes', () => {
    expect([...sshString(bytes(1, 2, 3))]).toEqual([0, 0, 0, 3, 1, 2, 3]);
    expect([...sshString(bytes())]).toEqual([0, 0, 0, 0]);
  });

  it('writes mpints minimal and positive (RFC 4251 examples)', () => {
    expect([...sshMpint(bytes(0))]).toEqual([0, 0, 0, 0]);
    expect([
      ...sshMpint(bytes(0x09, 0xa3, 0x78, 0xf9, 0xb2, 0xe3, 0x32, 0xa7)),
    ]).toEqual([0, 0, 0, 8, 0x09, 0xa3, 0x78, 0xf9, 0xb2, 0xe3, 0x32, 0xa7]);
    expect([...sshMpint(bytes(0x80))]).toEqual([0, 0, 0, 2, 0, 0x80]);
    expect([...sshMpint(bytes(0, 0, 0x01, 0x00, 0x01))]).toEqual([
      0, 0, 0, 3, 1, 0, 1,
    ]);
  });

  it('reads a blob back into fields and refuses a truncated one', () => {
    const blob = new Uint8Array([
      ...sshString(bytes(7)),
      ...sshString(bytes(8, 9)),
    ]);
    expect(readSshFields(blob).map((f) => [...f])).toEqual([[7], [8, 9]]);
    expect(() => readSshFields(blob.subarray(0, 6))).toThrow(/truncated/);
  });
});

describe('sshPublicKey', () => {
  it('builds ssh-ed25519: type then the 32-byte key', () => {
    const x = crypto.getRandomValues(new Uint8Array(32));
    const key = sshPublicKey({ kty: 'OKP', crv: 'Ed25519', x: b64url(x) });
    const [type, pub] = readSshFields(key.blob);
    expect(utf8Decode(type)).toBe('ssh-ed25519');
    expect([...pub]).toEqual([...x]);
    expect(key.blob.length).toBe(4 + 11 + 4 + 32);
    expect(key).toMatchObject({
      type: 'ssh-ed25519',
      bits: 256,
      label: 'ED25519',
    });
  });

  it.each([
    ['P-256', 'nistp256', 32, 256],
    ['P-384', 'nistp384', 48, 384],
    ['P-521', 'nistp521', 66, 521],
  ])('builds ecdsa-sha2 for %s', (crv, id, len, bits) => {
    const x = crypto.getRandomValues(new Uint8Array(len));
    const y = crypto.getRandomValues(new Uint8Array(len));
    const key = sshPublicKey({ kty: 'EC', crv, x: b64url(x), y: b64url(y) });
    const [type, curve, point] = readSshFields(key.blob);
    expect(utf8Decode(type)).toBe(`ecdsa-sha2-${id}`);
    expect(utf8Decode(curve)).toBe(id);
    expect(point[0]).toBe(4);
    expect([...point.subarray(1)]).toEqual([...x, ...y]);
    expect(key.bits).toBe(bits);
  });

  it('builds ssh-rsa: e then n as mpints, n padded when its top bit is set', () => {
    const n = crypto.getRandomValues(new Uint8Array(256));
    n[0] |= 0x80;
    const key = sshPublicKey({ kty: 'RSA', n: b64url(n), e: 'AQAB' });
    const [type, e, mod] = readSshFields(key.blob);
    expect(utf8Decode(type)).toBe('ssh-rsa');
    expect([...e]).toEqual([1, 0, 1]);
    expect(mod.length).toBe(257);
    expect(mod[0]).toBe(0);
    expect([...mod.subarray(1)]).toEqual([...n]);
    expect(key.bits).toBe(2048);
  });

  it('refuses keys OpenSSH has no form for', () => {
    expect(() => sshPublicKey({ kty: 'OKP', crv: 'X25519', x: 'AA' })).toThrow(
      /OpenSSH/,
    );
    expect(() =>
      sshPublicKey({ kty: 'EC', crv: 'P-192', x: 'AA', y: 'AA' }),
    ).toThrow(/P-192/);
  });
});

describe('OpenSSH lines', () => {
  const key = sshPublicKey({
    kty: 'OKP',
    crv: 'Ed25519',
    x: b64url(new Uint8Array(32).fill(1)),
  });

  it('formats the authorized_keys line with a one-line comment', () => {
    const line = sshPublicLine(key, ' me@laptop\nsecond ');
    const [type, body, ...comment] = line.split(' ');
    expect(type).toBe('ssh-ed25519');
    expect([...base64ToBytes(body)]).toEqual([...key.blob]);
    expect(comment.join(' ')).toBe('me@laptop second');
    expect(sshPublicLine(key).split(' ')).toHaveLength(2);
  });

  it('fingerprints as SHA256: and unpadded Base64 of the blob', async () => {
    const fp = await sshFingerprint(key.blob);
    const digest = new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        key.blob as Uint8Array<ArrayBuffer>,
      ),
    );
    expect(fp).toBe(`SHA256:${bytesToBase64(digest).replace(/=+$/, '')}`);
    expect(fp).not.toContain('=');
    expect(sshKeygenLine(key, fp, 'me')).toBe(`256 ${fp} me (ED25519)`);
    expect(sshKeygenLine(key, fp)).toBe(`256 ${fp} no comment (ED25519)`);
  });
});
