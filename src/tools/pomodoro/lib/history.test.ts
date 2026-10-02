import { describe, expect, it } from 'vitest';
import {
  historyToCsv,
  lastDays,
  localDate,
  recordSession,
  weeksGrid,
  type DayLog,
} from './history';

describe('recordSession', () => {
  it('aggregates sessions per day', () => {
    let h: DayLog[] = [];
    h = recordSession(h, { date: '2026-10-01', kind: 'work', minutes: 25 });
    h = recordSession(h, { date: '2026-10-01', kind: 'break', minutes: 5 });
    h = recordSession(h, { date: '2026-10-01', kind: 'work', minutes: 50 });
    h = recordSession(h, { date: '2026-09-30', kind: 'work', minutes: 25 });
    expect(h).toEqual([
      { date: '2026-09-30', workSessions: 1, workMinutes: 25, breaks: 0 },
      { date: '2026-10-01', workSessions: 2, workMinutes: 75, breaks: 1 },
    ]);
  });
  it('keeps at most 365 days, dropping the oldest', () => {
    let h: DayLog[] = [];
    const start = Date.UTC(2025, 0, 1);
    for (let i = 0; i < 370; i++) {
      const date = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
      h = recordSession(h, { date, kind: 'work', minutes: 25 });
    }
    expect(h).toHaveLength(365);
    expect(h[0].date).toBe('2025-01-06');
    expect(h[364].date).toBe('2026-01-05');
  });
});

describe('historyToCsv', () => {
  it('writes the header and one row per day', () => {
    expect(
      historyToCsv([
        { date: '2026-10-01', workSessions: 2, workMinutes: 50, breaks: 1 },
      ]),
    ).toBe('date,work_sessions,work_minutes,breaks\n2026-10-01,2,50,1\n');
    expect(historyToCsv([]).split('\n')[0]).toBe(
      'date,work_sessions,work_minutes,breaks',
    );
  });
});

describe('weeksGrid', () => {
  it('lays out 12 Monday-first weeks ending this week', () => {
    const today = new Date(2026, 9, 2, 15).getTime(); // a Friday
    const grid = weeksGrid(
      [{ date: localDate(today), workSessions: 3, workMinutes: 75, breaks: 2 }],
      today,
    );
    expect(grid).toHaveLength(12);
    expect(grid[11][0].date).toBe('2026-09-28');
    expect(grid[11][4]).toEqual({ date: '2026-10-02', workSessions: 3 });
    expect(grid[0][0].date).toBe('2026-07-13');
  });
});

describe('lastDays', () => {
  it('gives the last 7 days ending today, oldest first, zero-filled', () => {
    const today = new Date(2026, 9, 2, 9).getTime();
    const days = lastDays(
      [
        { date: '2026-09-30', workSessions: 2, workMinutes: 50, breaks: 1 },
        { date: '2026-09-01', workSessions: 9, workMinutes: 225, breaks: 8 },
      ],
      today,
    );
    expect(days.map((d) => d.date)).toEqual([
      '2026-09-26',
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
    expect(days.map((d) => d.workSessions)).toEqual([0, 0, 0, 0, 2, 0, 0]);
  });
});
