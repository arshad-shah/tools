import { describe, expect, it } from 'vitest';
import { bytesToBase64, utf8Encode } from '@/shared/lib/encoding';
import { decodeJwt } from './jwt';
import type { KeyInput } from '../types';
import { verifyJwt } from './verify';

const b64url = (b: Uint8Array) => bytesToBase64(b, { urlSafe: true });
const json = (v: unknown) => b64url(utf8Encode(JSON.stringify(v)));

// RFC 7515 appendix A.1 (HS256) and its JWK.
const RFC7515_A1 =
  'eyJ0eXAiOiJKV1QiLA0KICJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJqb2UiLA0KICJleHAiOjEzMDA4MTkzODAsDQogImh0dHA6Ly9leGFtcGxlLmNvbS9pc19yb290Ijp0cnVlfQ.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const RFC7515_A1_K =
  'AyM1SysPpbyDfgZld3umj1qzKObwVMkoqQ-EstJQLr_T-1qS0gZH75aKtMN3Yj0iPS4hcgUuTwjAzZr1Z9CAow';
const RFC7515_A1_JWK = JSON.stringify({ kty: 'oct', k: RFC7515_A1_K });

const secret = (
  value: string,
  encoding: 'text' | 'base64' | 'base64url' = 'text',
): KeyInput => ({ kind: 'secret', value, encoding });
const pem = (value: string): KeyInput => ({ kind: 'pem', value });
const jwk = (value: string): KeyInput => ({ kind: 'jwk', value });

const toPem = (der: ArrayBuffer, label = 'PUBLIC KEY') => {
  const b64 = bytesToBase64(new Uint8Array(der));
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
};

type GenParams = RsaHashedKeyGenParams | EcKeyGenParams | Algorithm;
type SignParams = AlgorithmIdentifier | RsaPssParams | EcdsaParams;

async function hmacSign(input: string, key: Uint8Array, hash = 'SHA-256') {
  const k = await crypto.subtle.importKey(
    'raw',
    key as Uint8Array<ArrayBuffer>,
    { name: 'HMAC', hash },
    false,
    ['sign'],
  );
  return b64url(
    new Uint8Array(await crypto.subtle.sign('HMAC', k, utf8Encode(input))),
  );
}

async function sign(
  header: Record<string, unknown>,
  gen: GenParams,
  signParams: SignParams,
) {
  const pair = (await crypto.subtle.generateKey(gen, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const input = `${json({ typ: 'JWT', ...header })}.${json({ sub: 'ü' })}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign(signParams, pair.privateKey, utf8Encode(input)),
  );
  return {
    token: `${input}.${b64url(sig)}`,
    pem: toPem(await crypto.subtle.exportKey('spki', pair.publicKey)),
    privatePem: toPem(
      await crypto.subtle.exportKey('pkcs8', pair.privateKey),
      'PRIVATE KEY',
    ),
    jwk: await crypto.subtle.exportKey('jwk', pair.publicKey),
    privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey),
  };
}

const rsa = (hash: string): RsaHashedKeyGenParams => ({
  name: 'RSASSA-PKCS1-v1_5',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash,
});
const pss = (hash: string): RsaHashedKeyGenParams => ({
  ...rsa(hash),
  name: 'RSA-PSS',
});
const ES256: [GenParams, SignParams] = [
  { name: 'ECDSA', namedCurve: 'P-256' },
  { name: 'ECDSA', hash: 'SHA-256' },
];

describe('verifyJwt: HMAC', () => {
  it('verifies the RFC 7515 A.1 HS256 example with its JWK', async () => {
    await expect(
      verifyJwt(decodeJwt(RFC7515_A1), jwk(RFC7515_A1_JWK)),
    ).resolves.toBe('verified');
  });

  it('reads the secret as text, Base64 or Base64url', async () => {
    const t = decodeJwt(RFC7515_A1);
    await expect(verifyJwt(t, secret(RFC7515_A1_K, 'base64url'))).resolves.toBe(
      'verified',
    );
    const std = RFC7515_A1_K.replace(/-/g, '+').replace(/_/g, '/');
    await expect(verifyJwt(t, secret(std, 'base64'))).resolves.toBe('verified');
    await expect(verifyJwt(t, secret(RFC7515_A1_K, 'text'))).resolves.toBe(
      'invalid',
    );
  });

  it('treats a secret that starts with { as a secret, not a JWK', async () => {
    const input = `${json({ alg: 'HS256' })}.${json({})}`;
    const value = '{not json';
    const t = decodeJwt(`${input}.${await hmacSign(input, utf8Encode(value))}`);
    await expect(verifyJwt(t, secret(value))).resolves.toBe('verified');
  });

  it.each([
    ['HS256', 'SHA-256'],
    ['HS384', 'SHA-384'],
    ['HS512', 'SHA-512'],
  ])(
    '%s verifies with a text secret and rejects a wrong one',
    async (alg, hash) => {
      const input = `${json({ alg })}.${json({ name: 'Zoë' })}`;
      const sig = await hmacSign(input, utf8Encode('s3cret'), hash);
      const d = decodeJwt(`${input}.${sig}`);
      await expect(verifyJwt(d, secret('s3cret'))).resolves.toBe('verified');
      await expect(verifyJwt(d, secret('wrong'))).resolves.toBe('invalid');
    },
  );
});

describe('verifyJwt: algorithm confusion (CVE-2015-9235)', () => {
  it('never verifies an HS256 token forged with the RSA public key as the HMAC secret', async () => {
    const { pem: publicPem, jwk: publicJwk } = await sign(
      { alg: 'RS256' },
      rsa('SHA-256'),
      'RSASSA-PKCS1-v1_5',
    );
    const input = `${json({ alg: 'HS256', typ: 'JWT' })}.${json({ admin: true })}`;
    const forged = decodeJwt(
      `${input}.${await hmacSign(input, utf8Encode(publicPem))}`,
    );

    // The public key pasted as a PEM, as a "secret" or as a JWK.
    for (const key of [
      pem(publicPem),
      secret(publicPem),
      jwk(JSON.stringify(publicJwk)),
      secret(JSON.stringify(publicJwk)),
    ]) {
      const result = verifyJwt(forged, key);
      await expect(result).rejects.toMatchObject({ code: 'INVALID_INPUT' });
      await expect(result).rejects.toThrow(/HS256 needs a shared secret/);
    }
  });

  it('refuses a shared secret or an oct JWK for RS/PS/ES/EdDSA', async () => {
    const { token } = await sign({ alg: 'ES256' }, ...ES256);
    const d = decodeJwt(token);
    await expect(verifyJwt(d, secret('s3cret'))).rejects.toThrow(
      /ES256 needs a public key/,
    );
    await expect(verifyJwt(d, jwk(RFC7515_A1_JWK))).rejects.toThrow(
      /ES256 needs a public key/,
    );
  });

  it('refuses a JWK of the wrong key type for the algorithm', async () => {
    const { token } = await sign({ alg: 'ES256' }, ...ES256);
    const { jwk: rsaJwk } = await sign(
      { alg: 'RS256' },
      rsa('SHA-256'),
      'RSASSA-PKCS1-v1_5',
    );
    await expect(
      verifyJwt(decodeJwt(token), jwk(JSON.stringify(rsaJwk))),
    ).rejects.toThrow(/EC key/);
  });

  it('reports alg none as unsigned, whatever key is given', async () => {
    const none = decodeJwt(`${json({ alg: 'none' })}.${json({})}.`);
    await expect(verifyJwt(none, secret('x'))).resolves.toBe('unsigned');
    await expect(verifyJwt(none, pem('x'))).resolves.toBe('unsigned');
  });

  it('treats an empty signature on a signed alg as invalid', async () => {
    const t = decodeJwt(`${json({ alg: 'HS256' })}.${json({})}.`);
    await expect(verifyJwt(t, secret('x'))).resolves.toBe('invalid');
  });
});

describe('verifyJwt: asymmetric', () => {
  const cases: [string, GenParams, SignParams][] = [
    ['RS256', rsa('SHA-256'), 'RSASSA-PKCS1-v1_5'],
    ['RS384', rsa('SHA-384'), 'RSASSA-PKCS1-v1_5'],
    ['RS512', rsa('SHA-512'), 'RSASSA-PKCS1-v1_5'],
    ['PS256', pss('SHA-256'), { name: 'RSA-PSS', saltLength: 32 }],
    ['PS384', pss('SHA-384'), { name: 'RSA-PSS', saltLength: 48 }],
    ['PS512', pss('SHA-512'), { name: 'RSA-PSS', saltLength: 64 }],
    ['ES256', ...ES256],
    [
      'ES384',
      { name: 'ECDSA', namedCurve: 'P-384' },
      { name: 'ECDSA', hash: 'SHA-384' },
    ],
    [
      'ES512',
      { name: 'ECDSA', namedCurve: 'P-521' },
      { name: 'ECDSA', hash: 'SHA-512' },
    ],
    ['EdDSA', { name: 'Ed25519' }, { name: 'Ed25519' }],
  ];

  it.each(cases)(
    '%s verifies with a PEM or JWK public key and detects tampering',
    async (alg, gen, signParams) => {
      const k = await sign({ alg }, gen, signParams);
      const d = decodeJwt(k.token);
      await expect(verifyJwt(d, pem(k.pem))).resolves.toBe('verified');
      await expect(verifyJwt(d, jwk(JSON.stringify(k.jwk)))).resolves.toBe(
        'verified',
      );
      const parts = k.token.split('.');
      const tampered = decodeJwt(
        `${parts[0]}.${json({ sub: 'admin' })}.${parts[2]}`,
      );
      await expect(verifyJwt(tampered, pem(k.pem))).resolves.toBe('invalid');
    },
    20_000,
  );

  it('uses the public part of a private JWK', async () => {
    const k = await sign({ alg: 'ES256' }, ...ES256);
    await expect(
      verifyJwt(decodeJwt(k.token), jwk(JSON.stringify(k.privateJwk))),
    ).resolves.toBe('verified');
  });

  it('explains that a private PEM was pasted', async () => {
    const k = await sign({ alg: 'ES256' }, ...ES256);
    await expect(
      verifyJwt(decodeJwt(k.token), pem(k.privatePem)),
    ).rejects.toThrow(/private key/i);
  });
});

describe('verifyJwt: JWK and JWKS selection', () => {
  async function withKid(kid: string) {
    const pair = (await crypto.subtle.generateKey(ES256[0], true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair;
    const input = `${json({ alg: 'ES256', kid })}.${json({})}`;
    const sig = new Uint8Array(
      await crypto.subtle.sign(ES256[1], pair.privateKey, utf8Encode(input)),
    );
    return {
      token: decodeJwt(`${input}.${b64url(sig)}`),
      jwk: await crypto.subtle.exportKey('jwk', pair.publicKey),
    };
  }

  it('picks the key from a JWKS by kid and skips encryption keys', async () => {
    const mine = await withKid('mine');
    const other = await withKid('other');
    const set = JSON.stringify({
      keys: [
        { ...other.jwk, kid: 'other' },
        { ...other.jwk, kid: 'mine', use: 'enc' },
        { ...mine.jwk, kid: 'mine', use: 'sig' },
      ],
    });
    await expect(verifyJwt(mine.token, jwk(set))).resolves.toBe('verified');
  });

  it('refuses an ambiguous JWKS or a kid that does not match', async () => {
    const mine = await withKid('mine');
    const two = JSON.stringify({
      keys: [
        { ...mine.jwk, kid: 'a' },
        { ...mine.jwk, kid: 'b' },
      ],
    });
    await expect(verifyJwt(mine.token, jwk(two))).rejects.toThrow(/kid "mine"/);
    const single = JSON.stringify({ keys: [{ ...mine.jwk, kid: 'theirs' }] });
    await expect(verifyJwt(mine.token, jwk(single))).rejects.toThrow(
      /kid "theirs".*"mine"/,
    );
    const bare = JSON.stringify({ ...mine.jwk, kid: 'theirs' });
    await expect(verifyJwt(mine.token, jwk(bare))).rejects.toThrow(/kid/);
  });

  it('refuses an encryption key and a JWK alg that does not match', async () => {
    const mine = await withKid('mine');
    await expect(
      verifyJwt(mine.token, jwk(JSON.stringify({ ...mine.jwk, use: 'enc' }))),
    ).rejects.toThrow(/encryption/);
    await expect(
      verifyJwt(mine.token, jwk(JSON.stringify({ ...mine.jwk, alg: 'ES384' }))),
    ).rejects.toThrow(/JWK alg ES384 does not match token alg ES256/);
  });
});

describe('verifyJwt: errors', () => {
  it('refuses unsupported algorithms', async () => {
    const odd = decodeJwt(`${json({ alg: 'HS1' })}.${json({})}.c2ln`);
    await expect(verifyJwt(odd, secret('x'))).rejects.toMatchObject({
      code: 'UNSUPPORTED_FEATURE',
    });
  });

  it('explains a missing or unusable key', async () => {
    const { token } = await sign({ alg: 'ES256' }, ...ES256);
    const d = decodeJwt(token);
    await expect(verifyJwt(d, pem(''))).rejects.toThrow(/Enter the public key/);
    await expect(verifyJwt(d, pem('not a key'))).rejects.toThrow(/PEM/);
    await expect(verifyJwt(d, jwk('{oops'))).rejects.toThrow(/JWK/);
    await expect(
      verifyJwt(
        d,
        pem('-----BEGIN CERTIFICATE-----\nAA==\n-----END CERTIFICATE-----'),
      ),
    ).rejects.toThrow(/certificate/);
  });
});
