import { describe, expect, it } from 'vitest';
import { decodeJwt } from './jwt';
import { jwkAt, listJwksKeys, needsKeyPick } from './jwks';
import { generateJwtKeyPair, signJwt } from './sign';
import { verifyJwt } from './verify';

describe('listJwksKeys', () => {
  it('labels keys by type, kid and alg', () => {
    const set = JSON.stringify({
      keys: [
        { kty: 'RSA', kid: 'k1', alg: 'RS256', n: 'x', e: 'AQAB' },
        { kty: 'EC', crv: 'P-256', x: 'a', y: 'b' },
        { kty: 'RSA', use: 'enc', n: 'x', e: 'AQAB' },
        { kty: 'OKP' },
      ],
    });
    expect(listJwksKeys(set).map((k) => k.label)).toEqual([
      'RSA (kid k1, RS256)',
      'EC (P-256)',
      'OKP key 4',
    ]);
  });
  it('treats a single JWK as a one-key set', () => {
    expect(listJwksKeys('{"kty":"oct","k":"AA"}')).toHaveLength(1);
    expect(() => listJwksKeys('{')).toThrow(/not valid JWK/);
  });
  it('picking one verifies a token without a kid', async () => {
    const a = await generateJwtKeyPair('ES256');
    const b = await generateJwtKeyPair('ES256');
    const set = JSON.stringify({
      keys: [
        { ...a.publicJwk, kid: 'a' },
        { ...b.publicJwk, kid: 'b' },
      ],
    });
    const token = decodeJwt(
      await signJwt(
        {},
        { sub: '1' },
        { kind: 'private', key: b.privateKey },
        'ES256',
      ),
    );
    expect(needsKeyPick(set, token.header.kid)).toBe(true);
    await expect(
      verifyJwt(token, { kind: 'jwk', value: set }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    const picked = listJwksKeys(set).find((k) => k.kid === 'b')!;
    await expect(
      verifyJwt(token, { kind: 'jwk', value: jwkAt(set, picked.index) }),
    ).resolves.toBe('verified');
    await expect(
      verifyJwt(token, { kind: 'jwk', value: jwkAt(set, 0) }),
    ).resolves.toBe('invalid');
  });
});
