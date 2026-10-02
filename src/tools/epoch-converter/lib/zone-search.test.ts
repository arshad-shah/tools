import { describe, expect, it } from 'vitest';
import type { ZoneInfo } from '@/shared/lib/time';
import { moveItem, searchZones } from './zone-search';

const zones: ZoneInfo[] = [
  'UTC',
  'Europe/Dublin',
  'America/Los_Angeles',
  'America/New_York',
  'Asia/Kolkata',
  'America/Argentina/Buenos_Aires',
].map((id) => ({ id, label: id, offsetNow: 0 }));

const ids = (q: string) => searchZones(q, zones).map((z) => z.id);

describe('searchZones', () => {
  it('finds a zone by its city', () => {
    expect(ids('Dublin')).toEqual(['Europe/Dublin']);
    expect(ids('buenos')).toEqual(['America/Argentina/Buenos_Aires']);
    expect(ids('new york')).toEqual(['America/New_York']);
  });
  it('finds a zone by a common alias', () => {
    expect(ids('San Francisco')).toEqual(['America/Los_Angeles']);
    expect(ids('mumbai')).toEqual(['Asia/Kolkata']);
    expect(ids('gmt')).toEqual(['UTC']);
  });
  it('puts prefix matches first and ignores empty queries', () => {
    expect(ids('america')[0]).toMatch(/^America\//);
    expect(ids('  ')).toEqual([]);
  });
});

describe('moveItem', () => {
  it('moves within bounds only', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 2, -2)).toEqual(['c', 'a', 'b']);
    const same = ['a', 'b'];
    expect(moveItem(same, 0, -1)).toBe(same);
  });
});
