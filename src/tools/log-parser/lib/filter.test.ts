import { describe, expect, it } from 'vitest';
import { EMPTY_FILTER, matchesFilter, type LogFilter } from './filter';
import type { LogEntry } from './model';

const entry: LogEntry = {
  index: 0,
  line: 1,
  ts: 1000,
  level: 'error',
  component: 'db.Pool',
  message: 'Connection refused to 10.0.0.1',
  fields: { host: 'a', status: '500' },
  raw: '1970 ERROR [db.Pool] Connection refused to 10.0.0.1',
};
const f = (x: Partial<LogFilter>): LogFilter => ({ ...EMPTY_FILTER, ...x });

describe('matchesFilter', () => {
  it.each<[string, Partial<LogFilter>, Partial<LogEntry>, boolean]>([
    ['empty filter', {}, {}, true],
    ['level kept', { levels: new Set(['error', 'warn']) }, {}, true],
    ['level dropped', { levels: new Set(['info']) }, {}, false],
    [
      'no level vs none',
      { levels: new Set(['none']) },
      { level: undefined },
      true,
    ],
    [
      'text literal, any case',
      { text: { value: 'REFUSED', regex: false } },
      {},
      true,
    ],
    [
      'text literal miss',
      { text: { value: 'timeout', regex: false } },
      {},
      false,
    ],
    ['regex hit', { text: { value: '10\\.0\\.\\d+', regex: true } }, {}, true],
    ['regex miss', { text: { value: '^INFO', regex: true } }, {}, false],
    ['exclude', { exclude: ['refused'] }, {}, false],
    ['exclude other', { exclude: ['timeout', ''] }, {}, true],
    ['component match', { component: 'pool' }, {}, true],
    [
      'component missing',
      { component: 'pool' },
      { component: undefined },
      false,
    ],
    ['range inside', { range: [0, 2000] }, {}, true],
    ['range outside', { range: [2000, 3000] }, {}, false],
    ['range without ts', { range: [0, 2000] }, { ts: undefined }, false],
    [
      'field include',
      { fields: [{ key: 'host', value: 'a', mode: 'include' }] },
      {},
      true,
    ],
    [
      'field include miss',
      { fields: [{ key: 'host', value: 'b', mode: 'include' }] },
      {},
      false,
    ],
    [
      'field exclude',
      { fields: [{ key: 'status', value: '500', mode: 'exclude' }] },
      {},
      false,
    ],
    [
      'field exclude other',
      { fields: [{ key: 'status', value: '200', mode: 'exclude' }] },
      {},
      true,
    ],
  ])('%s', (_name, filter, patch, expected) => {
    expect(matchesFilter({ ...entry, ...patch }, f(filter))).toBe(expected);
  });

  it('reports an invalid regex as INVALID_INPUT', () => {
    expect(() =>
      matchesFilter(entry, f({ text: { value: '(', regex: true } })),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });
});
