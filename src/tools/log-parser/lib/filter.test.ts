import { describe, expect, it } from 'vitest';
import type { FilterCriteria, LogEntry } from '../types';
import { countLogsByLevel, filterLogs } from './filter';

const logs: LogEntry[] = [
  {
    id: 0,
    level: 'error',
    component: 'db.Pool',
    message: 'down',
    raw: 'DB down',
    timestamp: '2024-01-15 08:00:00,000',
  },
  {
    id: 1,
    level: 'info',
    component: 'web.Api',
    message: 'ok',
    raw: 'Request OK',
    timestamp: '2024-01-15 09:00:00,000',
  },
  { id: 2, level: 'warn', message: 'slow', raw: 'Slow request' },
  {
    id: 3,
    level: 'info',
    component: 'db.Migrate',
    message: 'done',
    raw: 'Migration done',
  },
];

const all: FilterCriteria['levelFilters'] = {
  error: true,
  warn: true,
  info: true,
  debug: true,
  success: true,
};
const ids = (c: Partial<FilterCriteria>) =>
  filterLogs(logs, { levelFilters: all, timeRange: {}, ...c }).map((l) => l.id);

describe('filterLogs', () => {
  it('filters by level', () => {
    expect(ids({ levelFilters: { ...all, info: false } })).toEqual([0, 2]);
  });

  it('filters by case-insensitive text over the raw line', () => {
    expect(ids({ textSearch: 'REQUEST' })).toEqual([1, 2]);
  });

  it('filters by component but keeps entries without a component', () => {
    expect(ids({ component: 'DB' })).toEqual([0, 2, 3]);
  });

  it('filters by time range, keeping entries without a timestamp', () => {
    expect(ids({ timeRange: { start: '2024-01-15T08:30:00' } })).toEqual([
      1, 2, 3,
    ]);
    expect(ids({ timeRange: { end: '2024-01-15T08:30:00' } })).toEqual([
      0, 2, 3,
    ]);
  });
});

describe('countLogsByLevel', () => {
  it('counts every level', () => {
    expect(countLogsByLevel(logs)).toEqual({
      error: 1,
      warn: 1,
      info: 2,
      debug: 0,
      success: 0,
    });
  });
});
