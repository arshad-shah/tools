import { describe, expect, it } from 'vitest';
import { bestOverlap, planDay } from './planner';

describe('planDay', () => {
  it('finds the working-hour overlap of Dublin and New York', () => {
    const rows = planDay(
      '2024-06-03',
      ['Europe/Dublin', 'America/New_York'],
      [9, 17],
    );
    expect(rows).toHaveLength(24);
    expect(rows[8].cells[0]).toMatchObject({ localHour: 9, working: true });
    expect(rows[13].cells[1]).toMatchObject({ localHour: 9, working: true });
    expect(rows[16].cells[0].working).toBe(false);
    expect(bestOverlap(rows)).toEqual([13, 14, 15]);
  });
  it('falls back to the most-covered hours', () => {
    const rows = planDay(
      '2024-06-03',
      ['Asia/Tokyo', 'America/Los_Angeles'],
      [9, 17],
    );
    const best = bestOverlap(rows);
    expect(best.length).toBeGreaterThan(0);
    expect(bestOverlap(planDay('2024-06-03', [], [9, 17]))).toEqual([]);
  });
  it('keeps half-hour offsets', () => {
    const rows = planDay('2024-06-03', ['Asia/Kolkata'], [9, 17]);
    expect(rows[3].cells[0]).toMatchObject({
      localHour: 8,
      localMinute: 30,
      working: false,
    });
    expect(rows[4].cells[0]).toMatchObject({
      localHour: 9,
      localMinute: 30,
      working: true,
    });
  });
});
