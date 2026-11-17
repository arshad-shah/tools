import { describe, expect, it } from 'vitest';
import { jwkThumbprint, thumbprintInput } from './thumbprint';

/** The RSA public key of RFC 7638 section 3.1 (built from parts). */
const RFC_N = [
  '0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw',
].join('');

describe('jwkThumbprint (RFC 7638)', () => {
  it('matches the RFC 7638 example', async () => {
    const jwk: JsonWebKey = {
      kty: 'RSA',
      n: RFC_N,
      e: 'AQAB',
      alg: 'RS256',
    };
    expect(thumbprintInput(jwk)).toBe(
      `{"e":"AQAB","kty":"RSA","n":"${RFC_N}"}`,
    );
    expect(await jwkThumbprint(jwk)).toBe(
      'NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs',
    );
  });

  it('uses only the required members, sorted, for EC and OKP keys', () => {
    expect(
      thumbprintInput({ kty: 'EC', y: 'Y', x: 'X', crv: 'P-256', use: 'sig' }),
    ).toBe('{"crv":"P-256","kty":"EC","x":"X","y":"Y"}');
    expect(thumbprintInput({ kty: 'OKP', crv: 'Ed25519', x: 'X' })).toBe(
      '{"crv":"Ed25519","kty":"OKP","x":"X"}',
    );
  });

  it('ignores private members, so both halves share a kid', async () => {
    const pub: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'abc' };
    expect(await jwkThumbprint({ ...pub, d: 'secret-part' })).toBe(
      await jwkThumbprint(pub),
    );
  });

  it('refuses unknown types and missing members', () => {
    expect(() => thumbprintInput({ kty: 'oct' })).toThrow(/Unknown key type/);
    expect(() => thumbprintInput({ kty: 'EC', crv: 'P-256', x: 'X' })).toThrow(
      /"y"/,
    );
  });
});
