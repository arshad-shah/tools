import { describe, expect, it } from 'vitest';
import { getExpiryInfo } from './claims';
import { timeClaimsStatus } from './jwt';

describe('getExpiryInfo', () => {
  const now = 1_700_000_000;

  it('agrees with timeClaimsStatus at the exact expiry second', () => {
    expect(getExpiryInfo(now, now * 1000).isExpired).toBe(true);
    expect(timeClaimsStatus({ exp: now }, now).state).toBe('expired');
    expect(getExpiryInfo(now + 1, now * 1000).isExpired).toBe(false);
  });

  it('applies the same clock skew', () => {
    expect(getExpiryInfo(now - 30, now * 1000, 60).isExpired).toBe(false);
    expect(getExpiryInfo(now - 60, now * 1000, 60).isExpired).toBe(true);
  });
});
