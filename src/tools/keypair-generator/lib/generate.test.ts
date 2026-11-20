import { describe, expect, it } from 'vitest';
import { fromPem } from '@/shared/lib/crypto/keys';
import { utf8Decode } from '@/shared/lib/encoding';
import { keyExports, zipEntries, zipName } from './files';
import { generateKeyMaterial, supportsAlgorithm } from './generate';
import { DEFAULT_SPEC, keyUsages, type KeySpec } from './spec';
import { readSshFields } from './ssh';
import { jwkThumbprint } from './thumbprint';

const spec = (patch: Partial<KeySpec>): KeySpec => ({
  ...DEFAULT_SPEC,
  ...patch,
});

/** PEM labels, built so no key-looking literal sits in the source. */
const PRIVATE = ['PRIVATE', 'KEY'].join(' ');
const PUBLIC = ['PUBLIC', 'KEY'].join(' ');

describe('generateKeyMaterial', () => {
  it('Ed25519: PEM, JWK with thumbprint kid, OpenSSH', async () => {
    const m = await generateKeyMaterial(spec({ algorithm: 'Ed25519' }));
    expect(fromPem(m.privatePem).label).toBe(PRIVATE);
    expect(fromPem(m.publicPem).label).toBe(PUBLIC);
    expect(m.privatePem.split('\n').every((l) => l.length <= 64)).toBe(true);
    expect(m.kid).toBe(await jwkThumbprint(m.publicJwk));
    expect(m.publicJwk).toMatchObject({
      kty: 'OKP',
      crv: 'Ed25519',
      kid: m.kid,
      use: 'sig',
      alg: 'EdDSA',
    });
    expect(m.publicJwk).not.toHaveProperty('d');
    expect(typeof m.privateJwk.d).toBe('string');
    expect(m.privateJwk).not.toHaveProperty('key_ops');
    expect(m.ssh?.type).toBe('ssh-ed25519');
    expect(m.ssh?.fingerprint).toMatch(/^SHA256:[A-Za-z0-9+/]{43}$/);
  });

  it('the exported PEM imports back and verifies a signature', async () => {
    const m = await generateKeyMaterial(
      spec({ algorithm: 'ECDSA', curve: 'P-384' }),
    );
    const pub = await crypto.subtle.importKey(
      'spki',
      fromPem(m.publicPem).der,
      { name: 'ECDSA', namedCurve: 'P-384' },
      true,
      ['verify'],
    );
    const priv = await crypto.subtle.importKey(
      'jwk',
      m.privateJwk,
      { name: 'ECDSA', namedCurve: 'P-384' },
      false,
      ['sign'],
    );
    const data = new Uint8Array([1, 2, 3]);
    const params = { name: 'ECDSA', hash: 'SHA-384' };
    const sig = await crypto.subtle.sign(params, priv, data);
    expect(await crypto.subtle.verify(params, pub, sig, data)).toBe(true);
    expect(m.publicJwk.alg).toBe('ES384');
    const [type, curve] = readSshFields(m.ssh!.blob);
    expect(utf8Decode(type)).toBe('ecdsa-sha2-nistp384');
    expect(utf8Decode(curve)).toBe('nistp384');
  });

  it('RSA-PSS 2048: modulus size, alg and an ssh-rsa key', async () => {
    const m = await generateKeyMaterial(
      spec({ algorithm: 'RSA-PSS', size: 2048, hash: 'SHA-512' }),
    );
    expect(m.publicJwk).toMatchObject({ kty: 'RSA', e: 'AQAB', alg: 'PS512' });
    expect(m.ssh).toMatchObject({ type: 'ssh-rsa', bits: 2048, label: 'RSA' });
  });

  it('key agreement and encryption keys have no OpenSSH form', async () => {
    const ecdh = await generateKeyMaterial(spec({ algorithm: 'ECDH' }));
    expect(ecdh.ssh).toBeNull();
    expect(ecdh.publicJwk).toMatchObject({ use: 'enc', alg: 'ECDH-ES' });
    const x = await generateKeyMaterial(spec({ algorithm: 'X25519' }));
    expect(x.publicJwk).toMatchObject({ kty: 'OKP', crv: 'X25519' });
    expect(keyExports(x, '').map((e) => e.id)).not.toContain('openssh');
  });

  it('reports what the runtime supports', async () => {
    expect(await supportsAlgorithm('RSA-OAEP')).toBe(true);
    expect(typeof (await supportsAlgorithm('X25519'))).toBe('boolean');
    expect(keyUsages('RSA-OAEP')).toContain('encrypt');
  });
});

describe('exports', () => {
  it('names files by type and puts the comment on the OpenSSH line', async () => {
    const m = await generateKeyMaterial(spec({ algorithm: 'Ed25519' }));
    const out = keyExports(m, 'deploy key');
    expect(out.map((e) => e.filename)).toEqual([
      'ed25519-private.pem',
      'ed25519-public.pem',
      'ed25519-private.jwk.json',
      'ed25519-public.jwk.json',
      'id_ed25519.pub',
    ]);
    expect(out.filter((e) => e.secret).map((e) => e.id)).toEqual([
      'private-pem',
      'private-jwk',
    ]);
    expect(out.at(-1)?.text).toMatch(/^ssh-ed25519 \S+ deploy key\n$/);
    expect(JSON.parse(out[3].text).kid).toBe(m.kid);
    expect(zipEntries(m, '')).toHaveLength(5);
    expect(zipName(m)).toBe('ed25519-keypair.zip');
  });
});
