import { describe, expect, it } from 'vitest';
import { categorizeClaims } from './categorize';

describe('categorizeClaims', () => {
  it('returns empty groups without a payload', () => {
    expect(categorizeClaims(undefined)).toEqual({
      identity: [],
      access: [],
      timing: [],
      issuer: [],
      custom: [],
    });
  });

  it('sorts claims into groups, keeping payload order', () => {
    expect(
      categorizeClaims({
        sub: '1',
        scope: 'a',
        exp: 2,
        iss: 'i',
        foo: 3,
        email: 'e',
        roles: ['r'],
        jti: 'j',
      }),
    ).toEqual({
      identity: [
        ['sub', '1'],
        ['email', 'e'],
      ],
      access: [
        ['scope', 'a'],
        ['roles', ['r']],
      ],
      timing: [['exp', 2]],
      issuer: [
        ['iss', 'i'],
        ['jti', 'j'],
      ],
      custom: [['foo', 3]],
    });
  });
});
