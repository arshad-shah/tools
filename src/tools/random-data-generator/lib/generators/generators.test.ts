import { describe, expect, it } from 'vitest';
import { MOCK_FIELD_TYPES } from '@/shared/lib/data-formats/mock-schema';
import { createPrng } from '@/shared/lib/prng';
import { localeData } from '../locales';
import { GENERATORS } from '.';
import { uuidV4 } from './ids';
import { FIELD_TYPE_INFO } from './labels';
import { ipv4, ipv6, mac } from './net';
import { cron, semver } from './text';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generators', () => {
  it('makes version 4 UUIDs', () => {
    const rng = createPrng('uuid');
    for (let i = 0; i < 200; i++) expect(uuidV4(rng)).toMatch(UUID_V4);
  });

  it('makes network values in their formats', () => {
    const rng = createPrng('net');
    expect(ipv4(rng)).toMatch(/^(\d{1,3}\.){3}\d{1,3}$/);
    expect(ipv6(rng)).toMatch(/^2[0-9a-f]{3}(:[0-9a-f]{4}){7}$/);
    expect(mac(rng)).toMatch(/^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/);
    expect(semver(rng)).toMatch(/^\d+\.\d+\.\d+$/);
    expect(cron(rng).split(' ')).toHaveLength(5);
  });

  it('has a generator or engine rule and a label for every type', () => {
    const engine = new Set(['object', 'array', 'foreign-key']);
    for (const t of MOCK_FIELD_TYPES) {
      expect(FIELD_TYPE_INFO[t]?.label).toBeTruthy();
      if (!engine.has(t)) expect(t in GENERATORS).toBe(true);
    }
    expect(MOCK_FIELD_TYPES.length).toBeGreaterThanOrEqual(50);
  });

  it('runs every leaf generator', () => {
    const ctx = { rng: createPrng('all'), locale: localeData('en-US'), row: 0 };
    for (const [type, gen] of Object.entries(GENERATORS)) {
      const field = {
        name: type,
        type,
        enum: [{ value: 'a', weight: 1 }],
        pattern: '[a-z]{3}',
      } as never;
      expect(gen(field, ctx)).not.toBeUndefined();
    }
  });
});
