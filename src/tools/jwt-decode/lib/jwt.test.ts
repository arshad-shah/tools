import { describe, expect, it } from 'vitest';
import { bytesToBase64, utf8Encode } from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';
import { decodeJwt, timeClaimsStatus } from './jwt';

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
});
