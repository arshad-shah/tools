import { describe, expect, it } from 'vitest';
import { verifyJwt } from '@/tools/jwt-decode/lib/verify';
import { bytesToBase64, utf8Encode } from '../encoding';
import { fromPem, generateSigningKeyPair, toPem } from './keys';

const b64url = (b: Uint8Array) =>
  bytesToBase64(b, { urlSafe: true, padding: false });

describe('PEM', () => {
  it('round-trips DER and wraps at 64 columns', () => {
    const der = crypto.getRandomValues(new Uint8Array(200));
    const pem = toPem('PUBLIC KEY', der);
    expect(pem.split('\n').every((l) => l.length <= 64)).toBe(true);
    const back = fromPem(`junk\n${pem}junk`);
    expect(back.label).toBe('PUBLIC KEY');
    expect([...back.der]).toEqual([...der]);
    expect(() => fromPem('nothing')).toThrow(/PEM/);
  });
});

describe('generateSigningKeyPair', () => {
  it.each([
    ['ES256', { name: 'ECDSA', hash: 'SHA-256' }],
    ['EdDSA', { name: 'Ed25519' }],
  ] as const)(
    '%s yields a PEM that JWT verification accepts',
    async (alg, signParams) => {
      const pair = await generateSigningKeyPair(alg);
      expect(pair.publicPem).toMatch(/^-----BEGIN PUBLIC KEY-----/);
      expect(pair.privatePem).toMatch(/^-----BEGIN PRIVATE KEY-----/);
      expect(pair.publicJwk).toMatchObject({ alg, use: 'sig' });
      expect(pair.publicJwk).not.toHaveProperty('d');
      expect(pair.privateJwk).toHaveProperty('d');

      const header = b64url(utf8Encode(JSON.stringify({ alg, typ: 'JWT' })));
      const payload = b64url(utf8Encode(JSON.stringify({ sub: '1' })));
      const signingInput = `${header}.${payload}`;
      const sig = new Uint8Array(
        await crypto.subtle.sign(
          signParams,
          pair.privateKey,
          utf8Encode(signingInput),
        ),
      );
      const token = {
        header: { alg, typ: 'JWT' },
        payload: { sub: '1' },
        signature: b64url(sig),
        signingInput,
      };
      await expect(
        verifyJwt(token as never, { kind: 'pem', value: pair.publicPem }),
      ).resolves.toBe('verified');
      await expect(
        verifyJwt({ ...token, signingInput: `${signingInput}x` } as never, {
          kind: 'pem',
          value: pair.publicPem,
        }),
      ).resolves.toBe('invalid');
    },
  );
  it('RS256 makes a 2048-bit key', async () => {
    const pair = await generateSigningKeyPair('RS256');
    expect(pair.publicJwk.kty).toBe('RSA');
    expect(fromPem(pair.publicPem).der.length).toBeGreaterThan(256);
  });
});
