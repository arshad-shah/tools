import { describe, expect, it } from 'vitest';
import { decodeId } from './decode';
import { nanoid, nanoidCollision } from './nanoid';
import { createUlid, CROCKFORD, ulidTime } from './ulid';
import { createUuidV7, formatUuid, MAX, NIL, uuidV4, uuidV5 } from './uuid';

const RFC_TIME = Date.parse('2022-02-22T19:22:22Z');

describe('uuid', () => {
  it('v4 is random and well formed', () => {
    const u = uuidV4();
    expect(u).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(uuidV4()).not.toBe(u);
  });
  it('v5 matches the RFC 9562 example', async () => {
    await expect(uuidV5('dns', 'www.example.com')).resolves.toBe(
      '2ed6657d-e927-568b-95e1-2665a8aea6a2',
    );
    await expect(
      uuidV5('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'www.example.com'),
    ).resolves.toBe('2ed6657d-e927-568b-95e1-2665a8aea6a2');
    await expect(uuidV5('not-a-uuid', 'x')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  });
  it('v7 is monotonic within one ms and decodes its time', () => {
    const v7 = createUuidV7();
    const now = () => RFC_TIME;
    const ids = Array.from({ length: 1000 }, () => v7(now));
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(1000);
    const d = decodeId(ids[0]);
    expect(d).toMatchObject({ kind: 'uuid', version: 7, variant: 'RFC 9562' });
    expect(d.kind === 'uuid' && d.timestamp).toBe(RFC_TIME);
  });
  it('v7 borrows the next ms when the counter overflows', () => {
    const v7 = createUuidV7();
    const ids = Array.from({ length: 4100 }, () => v7(() => RFC_TIME));
    expect([...ids].sort()).toEqual(ids);
    const last = decodeId(ids[4099]);
    expect(last.kind === 'uuid' && last.timestamp).toBe(RFC_TIME + 1);
  });
  it('formats', () => {
    const u = '2ed6657d-e927-568b-95e1-2665a8aea6a2';
    expect(
      formatUuid(u, { upper: true, hyphens: false, braces: true, urn: false }),
    ).toBe('{2ED6657DE927568B95E12665A8AEA6A2}');
    expect(
      formatUuid(u, { upper: false, hyphens: true, braces: false, urn: true }),
    ).toBe(`urn:uuid:${u}`);
  });
});

describe('decodeId', () => {
  it('reads the RFC 9562 v1, v6 and v7 examples', () => {
    for (const id of [
      'C232AB00-9414-11EC-B3C8-9F6BDECED846',
      '1EC9414C-232A-6B00-B3C8-9F6BDECED846',
      '017F22E2-79B0-7CC3-98C4-DC0C0C07398F',
    ]) {
      const d = decodeId(id);
      expect(d.kind === 'uuid' && d.timestamp).toBe(RFC_TIME);
    }
  });
  it('knows nil, max, braces, URNs and junk', () => {
    expect(decodeId(NIL)).toMatchObject({ special: 'nil' });
    expect(decodeId(MAX)).toMatchObject({ special: 'max' });
    expect(
      decodeId('urn:uuid:{2ed6657d-e927-568b-95e1-2665a8aea6a2}'),
    ).toMatchObject({ version: 5 });
    expect(decodeId('hello')).toEqual({ kind: 'unknown' });
  });
});

describe('ulid', () => {
  it('is 26 Crockford characters, monotonic, with its time', () => {
    const make = createUlid();
    const ids = Array.from({ length: 500 }, () => make(() => RFC_TIME));
    for (const id of ids) {
      expect(id).toHaveLength(26);
      for (const ch of id) expect(CROCKFORD).toContain(ch);
    }
    expect([...ids].sort()).toEqual(ids);
    expect(ulidTime(ids[0])).toBe(RFC_TIME);
    expect(decodeId(ids[0])).toEqual({ kind: 'ulid', timestamp: RFC_TIME });
    expect(ulidTime('01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(1469922850259);
  });
});

describe('nanoid', () => {
  it('has the length and alphabet', () => {
    const id = nanoid();
    expect(id).toMatch(/^[A-Za-z0-9_-]{21}$/);
    expect(nanoid('abc', 5)).toMatch(/^[abc]{5}$/);
    expect(() => nanoid('a', 5)).toThrow(/at least 2/);
    expect(() => nanoid('ab', 65)).toThrow(/2 to 64/);
  });
  it('spreads evenly over a 2-character alphabet', () => {
    const s = Array.from({ length: 1000 }, () => nanoid('01', 50)).join('');
    const ones = [...s].filter((c) => c === '1').length / s.length;
    expect(Math.abs(ones - 0.5)).toBeLessThan(0.02);
  });
  it('estimates collisions', () => {
    expect(nanoidCollision(64, 21, 1000)).toMatch(
      /^About a 1% chance of a collision after .* IDs \(.* years at 1,000 IDs per hour\)$/,
    );
    expect(nanoidCollision(10, 4, 1000)).toMatch(/after 14 IDs \(/);
  });
});
