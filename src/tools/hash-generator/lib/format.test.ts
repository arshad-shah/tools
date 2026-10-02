import { describe, expect, it } from 'vitest';
import { formatDigest } from './format';

describe('formatDigest', () => {
  it('formats hex in every output', () => {
    expect(formatDigest('00ff', 'base64')).toBe('AP8=');
    expect(formatDigest('00ff', 'hex')).toBe('00ff');
    expect(formatDigest('00ff', 'HEX')).toBe('00FF');
    expect(formatDigest('fbff', 'base64url')).toBe('-_8');
  });
});
