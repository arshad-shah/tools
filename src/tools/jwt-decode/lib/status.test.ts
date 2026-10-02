import { describe, expect, it } from 'vitest';
import { SIGNATURE_TEXT, sameKey, timeText } from './status';

describe('sameKey', () => {
  it('compares kind, value and secret encoding', () => {
    const a = { kind: 'secret', value: 'k', encoding: 'text' } as const;
    expect(sameKey(a, { ...a })).toBe(true);
    expect(sameKey(a, { ...a, encoding: 'base64' })).toBe(false);
    expect(sameKey(a, { ...a, value: 'x' })).toBe(false);
    expect(
      sameKey({ kind: 'pem', value: 'k' }, { kind: 'jwk', value: 'k' }),
    ).toBe(false);
  });
});

describe('timeText', () => {
  it('describes each time state', () => {
    expect(timeText({ state: 'none' })).toEqual({
      title: 'No time claims',
      detail: 'The token has no exp, nbf or iat claim.',
      tone: 'neutral',
    });
    expect(timeText({ state: 'expired', exp: 1 }).tone).toBe('danger');
    expect(timeText({ state: 'current' })).toMatchObject({
      title: 'Within validity window',
      detail: 'No expiry (exp) claim.',
      tone: 'success',
    });
  });

  it('has text for every signature state', () => {
    expect(SIGNATURE_TEXT.verified.tone).toBe('success');
    expect(SIGNATURE_TEXT.unverified.title).toBe('Signature not verified');
  });
});
