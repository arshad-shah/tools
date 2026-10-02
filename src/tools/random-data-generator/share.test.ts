import { describe, expect, it } from 'vitest';
import { decodeShare, encodeShare } from '@/shared/lib/share-state';
import { PRESETS } from './lib/presets';
import { parseMockShare, type MockShare } from './share';

const good: MockShare = {
  v: 1,
  schema: PRESETS.orders,
  seed: 'abc',
  count: 250,
  locale: 'de-DE',
};

describe('parseMockShare', () => {
  it('accepts a valid share', () => {
    expect(parseMockShare(good)).toEqual(good);
  });

  it.each([
    ['a newer version', { ...good, v: 2 }],
    ['a count over the cap', { ...good, count: 1_000_001 }],
    ['a fractional count', { ...good, count: 1.5 }],
    ['an unknown locale', { ...good, locale: 'xx-XX' }],
    ['a missing seed', { ...good, seed: undefined }],
    [
      'an unknown field type',
      {
        ...good,
        schema: {
          tables: [{ name: 't', fields: [{ name: 'a', type: 'nope' }] }],
        },
      },
    ],
    ['not an object', 'x'],
  ])('refuses %s', (_, raw) => {
    expect(parseMockShare(raw)).toBeNull();
  });

  it('fits a share link and round-trips', () => {
    const encoded = encodeShare(good, 1);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;
    const back = decodeShare(encoded.fragment);
    expect(parseMockShare(back.state)).toEqual(good);
  });
});
