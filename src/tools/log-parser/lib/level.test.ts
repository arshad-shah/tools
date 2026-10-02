import { describe, expect, it } from 'vitest';
import { detectLevel, normaliseLevel, syslogLevel } from './level';

describe('detectLevel', () => {
  it.each([
    ['[ERROR] boom', 'ERROR'],
    ['ERROR boom', 'ERROR'],
    ['WARN: disk at 90%', 'WARN'],
    ['2024-01-01 12:00:00 INFO started', 'INFO'],
    ['2024-01-01T12:00:00Z [warning] slow', 'WARNING'],
    ['app | <DEBUG> tick', 'DEBUG'],
    ['ts=1 level=error msg=x', 'ERROR'],
  ])('reads %j as %s', (line, level) => {
    expect(detectLevel(line)).toBe(level);
  });

  it.each([
    'processed 10 items, errors=0',
    'no errors found',
    'information desk',
    'Errorless run',
    'user=info msg=hello',
  ])('finds no level in %j', (line) => {
    expect(detectLevel(line)).toBeUndefined();
  });
});

describe('normaliseLevel', () => {
  it('maps names, aliases and pino numbers', () => {
    expect(normaliseLevel('WARNING')).toBe('warn');
    expect(normaliseLevel('ERR')).toBe('error');
    expect(normaliseLevel('critical')).toBe('fatal');
    expect(normaliseLevel(30)).toBe('info');
    expect(normaliseLevel(50)).toBe('error');
    expect(normaliseLevel('60')).toBe('fatal');
    expect(normaliseLevel(10)).toBe('trace');
    expect(normaliseLevel('bogus')).toBeUndefined();
    expect(normaliseLevel(undefined)).toBeUndefined();
  });
  it('maps syslog severities', () => {
    expect([0, 3, 4, 5, 6, 7].map(syslogLevel)).toEqual([
      'fatal',
      'error',
      'warn',
      'info',
      'info',
      'debug',
    ]);
  });
});
