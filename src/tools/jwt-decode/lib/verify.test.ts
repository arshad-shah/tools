import { describe, expect, it } from 'vitest';
import { bytesToBase64, utf8Encode } from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';
import { decodeJwt } from './jwt';
import { verifyJwt } from './verify';

const b64url = (b: Uint8Array) => bytesToBase64(b, { urlSafe: true });
const json = (v: unknown) => b64url(utf8Encode(JSON.stringify(v)));

// RFC 7515 appendix A.1 (HS256) and its JWK.
const RFC7515_A1 =
  'eyJ0eXAiOiJKV1QiLA0KICJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJqb2UiLA0KICJleHAiOjEzMDA4MTkzODAsDQogImh0dHA6Ly9leGFtcGxlLmNvbS9pc19yb290Ijp0cnVlfQ.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const RFC7515_A1_K =
  'AyM1SysPpbyDfgZld3umj1qzKObwVMkoqQ-EstJQLr_T-1qS0gZH75aKtMN3Yj0iPS4hcgUuTwjAzZr1Z9CAow';
const RFC7515_A1_JWK = JSON.stringify({ kty: 'oct', k: RFC7515_A1_K });

const toPem = (der: ArrayBuffer) => {
  const b64 = bytesToBase64(new Uint8Array(der));
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----\n`;
};

type GenParams = RsaHashedKeyGenParams | EcKeyGenParams;
type SignParams = AlgorithmIdentifier | RsaPssParams | EcdsaParams;

async function sign(alg: string, gen: GenParams, signParams: SignParams) {
  const pair = (await crypto.subtle.generateKey(gen, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const input = `${json({ alg, typ: 'JWT' })}.${json({ sub: 'ü' })}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign(signParams, pair.privateKey, utf8Encode(input)),
  );
  const pem = toPem(await crypto.subtle.exportKey('spki', pair.publicKey));
  const jwk = JSON.stringify(
    await crypto.subtle.exportKey('jwk', pair.publicKey),
  );
  return { token: `${input}.${b64url(sig)}`, pem, jwk };
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
      verifyJwt(decodeJwt(RFC7515_A1), RFC7515_A1_JWK),
    ).resolves.toBe(true);
  });

  it('accepts a Base64url-encoded secret', async () => {
    await expect(
      verifyJwt(decodeJwt(RFC7515_A1), RFC7515_A1_K, {
        secretEncoding: 'base64url',
      }),
    ).resolves.toBe(true);
    await expect(verifyJwt(decodeJwt(RFC7515_A1), RFC7515_A1_K)).resolves.toBe(
      false,
    );
  });

  it.each([
    ['HS256', 'SHA-256'],
    ['HS384', 'SHA-384'],
    ['HS512', 'SHA-512'],
  ])(
    '%s verifies with a text secret and rejects a wrong one',
    async (alg, hash) => {
      const input = `${json({ alg })}.${json({ name: 'Zoë' })}`;
      const key = await crypto.subtle.importKey(
        'raw',
        utf8Encode('s3cret'),
        { name: 'HMAC', hash },
        false,
        ['sign'],
      );
      const sig = new Uint8Array(
        await crypto.subtle.sign('HMAC', key, utf8Encode(input)),
      );
      const d = decodeJwt(`${input}.${b64url(sig)}`);
      await expect(verifyJwt(d, 's3cret')).resolves.toBe(true);
      await expect(verifyJwt(d, 'wrong')).resolves.toBe(false);
    },
  );
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
  ];

  it.each(cases)(
    '%s verifies with a PEM or JWK public key and detects tampering',
    async (alg, gen, signParams) => {
      const { token, pem, jwk } = await sign(alg, gen, signParams);
      const d = decodeJwt(token);
      await expect(verifyJwt(d, pem)).resolves.toBe(true);
      await expect(verifyJwt(d, jwk)).resolves.toBe(true);
      const parts = token.split('.');
      const tampered = decodeJwt(
        `${parts[0]}.${json({ sub: 'admin' })}.${parts[2]}`,
      );
      await expect(verifyJwt(tampered, pem)).resolves.toBe(false);
    },
    20_000,
  );

  it('picks the key from a JWKS by kid, or the only key', async () => {
    const a = await sign('ES256', ...ES256);
    const pair = (await crypto.subtle.generateKey(ES256[0], true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair;
    const input = `${json({ alg: 'ES256', kid: 'mine' })}.${json({})}`;
    const sig = new Uint8Array(
      await crypto.subtle.sign(ES256[1], pair.privateKey, utf8Encode(input)),
    );
    const pub = await crypto.subtle.exportKey('jwk', pair.publicKey);
    const withKid = decodeJwt(`${input}.${b64url(sig)}`);
    const set = JSON.stringify({
      keys: [
        { ...JSON.parse(a.jwk), kid: 'other' },
        { ...pub, kid: 'mine' },
      ],
    });
    await expect(verifyJwt(withKid, set)).resolves.toBe(true);
    // Several keys and no kid in the token: ambiguous.
    await expect(verifyJwt(decodeJwt(a.token), set)).rejects.toThrow(/kid/);
    const single = JSON.stringify({ keys: [JSON.parse(a.jwk)] });
    await expect(verifyJwt(decodeJwt(a.token), single)).resolves.toBe(true);
  });
});

describe('verifyJwt: errors', () => {
  it('refuses alg "none" and unsupported algorithms', async () => {
    const none = decodeJwt(`${json({ alg: 'none' })}.${json({})}.`);
    await expect(verifyJwt(none, 'x')).rejects.toThrow(/unsigned/i);
    const odd = decodeJwt(`${json({ alg: 'EdDSA' })}.${json({})}.c2ln`);
    await expect(verifyJwt(odd, 'x')).rejects.toThrow(ToolError);
  });

  it('explains a missing or unusable key', async () => {
    const { token } = await sign('ES256', ...ES256);
    await expect(verifyJwt(decodeJwt(token), '')).rejects.toThrow(/key/i);
    await expect(verifyJwt(decodeJwt(token), 'not a key')).rejects.toThrow(
      /PEM|JWK/,
    );
  });
});
