import { describe, expect, it } from 'vitest';
import { relativeTime } from './relative-time';

describe('relativeTime', () => {
  it('words the distance in the largest whole unit', () => {
    const now = 1_000_000_000_000;
    expect(relativeTime(now - 2 * 3600 * 1000, now)).toMatch(/2 hours ago/);
    expect(relativeTime(now - 3 * 24 * 3600 * 1000, now)).toMatch(/3 days ago/);
    expect(relativeTime(now, now)).toMatch(/minute/);
  });
});
