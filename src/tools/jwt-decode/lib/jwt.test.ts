import { describe, expect, it } from 'vitest';
import { bytesToBase64, utf8Encode } from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';
import { decodeJwt, isExpired, timeClaimsStatus } from './jwt';

const b64url = (v: unknown) =>
  bytesToBase64(utf8Encode(JSON.stringify(v)), { urlSafe: true });
const token = (payload: unknown, header: unknown = { alg: 'HS256' }) =>
  `${b64url(header)}.${b64url(payload)}.c2ln`;

describe('decodeJwt', () => {
  it('decodes UTF-8 claims (names with accents and CJK)', () => {
    const t = token({ name: 'Zoë Ñúñez', city: '東京' });
    const d = decodeJwt(t);
    expect(d.payload.name).toBe('Zoë Ñúñez');
    expect(d.payload.city).toBe('東京');
    expect(d.header.alg).toBe('HS256');
    expect(d.signingInput).toBe(t.split('.').slice(0, 2).join('.'));
    expect(d.signature).toBe('c2ln');
  });

  it('decodes the RFC 7515 A.1 example', () => {
    const d = decodeJwt(
      'eyJ0eXAiOiJKV1QiLA0KICJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJqb2UiLA0KICJleHAiOjEzMDA4MTkzODAsDQogImh0dHA6Ly9leGFtcGxlLmNvbS9pc19yb290Ijp0cnVlfQ.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    );
    expect(d.payload).toEqual({
      iss: 'joe',
      exp: 1300819380,
      'http://example.com/is_root': true,
    });
  });

  it('strips a Bearer prefix, quotes and whitespace', () => {
    const t = token({ sub: '1' });
    expect(decodeJwt(`Bearer ${t}`).payload.sub).toBe('1');
    expect(decodeJwt(`  "${t}"\n`).payload.sub).toBe('1');
  });

  it('explains encrypted (JWE) tokens', () => {
    expect(() => decodeJwt('a.b.c.d.e')).toThrow(/encrypted/i);
  });

  it('rejects malformed tokens with a ToolError', () => {
    expect(() => decodeJwt('abc')).toThrow(ToolError);
    expect(() => decodeJwt('###.e30.x')).toThrow(ToolError);
    expect(() => decodeJwt(`${b64url('str')}.e30.x`)).toThrow(ToolError);
  });
});

describe('timeClaimsStatus', () => {
  const now = 1_700_000_000;
  it('is "none" without exp or nbf', () => {
    expect(timeClaimsStatus({}, now).state).toBe('none');
  });
  it('reports expired tokens', () => {
    expect(timeClaimsStatus({ exp: now - 1 }, now).state).toBe('expired');
  });
  it('reports tokens that are not valid yet', () => {
    expect(timeClaimsStatus({ nbf: now + 60, exp: now + 120 }, now).state).toBe(
      'not-yet-valid',
    );
  });
  it('reports tokens inside their validity window', () => {
    expect(timeClaimsStatus({ nbf: now - 60, exp: now + 60 }, now).state).toBe(
      'current',
    );
  });
  it('ignores non-numeric time claims', () => {
    expect(timeClaimsStatus(JSON.parse('{"exp":"soon"}'), now).state).toBe(
      'none',
    );
  });
  it('is expired from the exp second itself', () => {
    expect(timeClaimsStatus({ exp: now }, now).state).toBe('expired');
    expect(timeClaimsStatus({ exp: now + 1 }, now).state).toBe('current');
  });
  it('reports a token issued in the future', () => {
    expect(timeClaimsStatus({ iat: now + 10 }, now).state).toBe(
      'issued-in-future',
    );
    expect(timeClaimsStatus({ iat: now }, now).state).toBe('current');
  });
  it('applies clock skew at the boundaries', () => {
    // exp: expired when now - skew >= exp.
    expect(timeClaimsStatus({ exp: now - 59 }, now, 60).state).toBe('current');
    expect(timeClaimsStatus({ exp: now - 60 }, now, 60).state).toBe('expired');
    // nbf: not yet valid when now + skew < nbf.
    expect(timeClaimsStatus({ nbf: now + 60 }, now, 60).state).toBe('current');
    expect(timeClaimsStatus({ nbf: now + 61 }, now, 60).state).toBe(
      'not-yet-valid',
    );
    // iat: in the future when iat > now + skew.
    expect(timeClaimsStatus({ iat: now + 60 }, now, 60).state).toBe('current');
    expect(timeClaimsStatus({ iat: now + 61 }, now, 60).state).toBe(
      'issued-in-future',
    );
  });
  it('reports the worst claim first', () => {
    expect(
      timeClaimsStatus({ exp: now - 1, nbf: now + 5, iat: now + 5 }, now).state,
    ).toBe('expired');
  });
});

describe('isExpired', () => {
  it('agrees with timeClaimsStatus at the exact second', () => {
    const now = 1_700_000_000;
    expect(isExpired(now, now)).toBe(true);
    expect(isExpired(now + 1, now)).toBe(false);
    expect(isExpired(now - 30, now, 60)).toBe(false);
  });
});

describe('strict segments', () => {
  it('rejects standard-alphabet or padded Base64 in a JWT', () => {
    const header = b64url({ alg: 'HS256' });
    expect(() => decodeJwt(`${header}.e30=.sig`)).toThrow(/Base64url/);
    expect(() => decodeJwt(`${header}.e30.a+b/`)).toThrow(/signature/);
  });
});
