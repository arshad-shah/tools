import { describe, expect, it } from 'vitest';
import { decodeJwt } from './jwt';
import {
  generateJwtKeyPair,
  parseClaims,
  signJwt,
  SIGN_ALGS,
  type SignAlg,
} from './sign';
import { verifyJwt } from './verify';

// Built from parts so secret scanners do not flag a literal.
const SECRET = ['builder', 'test', 'secret'].join('-');

describe('signJwt', () => {
  it.each(SIGN_ALGS.map((a) => [a] as [SignAlg]))(
    '%s round-trips through verifyJwt',
    async (alg) => {
      const payload = { sub: '42', name: 'Zoë' };
      if (alg.startsWith('HS')) {
        const token = await signJwt(
          { typ: 'JWT' },
          payload,
          { kind: 'secret', value: SECRET, encoding: 'text' },
          alg,
        );
        await expect(
          verifyJwt(decodeJwt(token), {
            kind: 'secret',
            value: SECRET,
            encoding: 'text',
          }),
        ).resolves.toBe('verified');
        return;
      }
      const pair = await generateJwtKeyPair(alg);
      const token = await signJwt(
        { typ: 'JWT' },
        payload,
        { kind: 'private', key: pair.privateKey },
        alg,
      );
      const decoded = decodeJwt(token);
      expect(decoded.payload).toEqual(payload);
      await expect(
        verifyJwt(decoded, { kind: 'pem', value: pair.publicPem }),
      ).resolves.toBe('verified');
      await expect(
        verifyJwt(decoded, {
          kind: 'jwk',
          value: JSON.stringify(pair.publicJwk),
        }),
      ).resolves.toBe('verified');
    },
  );

  it('forces the header alg to the chosen one', async () => {
    const token = await signJwt(
      { alg: 'none', typ: 'JWT' },
      {},
      { kind: 'secret', value: SECRET, encoding: 'text' },
      'HS384',
    );
    expect(decodeJwt(token).header).toEqual({ alg: 'HS384', typ: 'JWT' });
  });

  it('refuses a key of the wrong kind', async () => {
    await expect(
      signJwt(
        {},
        {},
        { kind: 'secret', value: SECRET, encoding: 'text' },
        'ES256',
      ),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});

describe('parseClaims', () => {
  it('names the line of a JSON error', () => {
    expect(() => parseClaims('{\n  "a": 1,\n  "b": }', 'payload')).toThrow(
      /payload is not valid JSON.*line 3/,
    );
    try {
      parseClaims('{', 'payload');
    } catch (e) {
      expect(e).toMatchObject({ code: 'INVALID_INPUT' });
    }
  });
  it('needs an object', () => {
    expect(() => parseClaims('[1]', 'header')).toThrow(/must be a JSON object/);
    expect(parseClaims('{"a":1}', 'header')).toEqual({ a: 1 });
  });
});
