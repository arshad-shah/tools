import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  relative,
  SIGNATURE_TEXT,
  sameKey,
  timeText,
} from './status';

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

describe('live durations', () => {
  it('formats and counts down', () => {
    expect(formatDuration(252)).toBe('4 min 12 s');
    expect(formatDuration(7500)).toBe('2 h 5 min');
    expect(formatDuration(90_000)).toBe('1 d 1 h');
    expect(relative(1000, 748, 'expires')).toBe('expires in 4 min 12 s');
    expect(relative(1000, 1003, 'expired')).toBe('expired 3 s ago');
  });
});
