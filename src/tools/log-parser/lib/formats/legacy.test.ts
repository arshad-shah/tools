import { describe, expect, it } from 'vitest';
import { createSampleLogs } from '../sample';
import { detectLogType, parseLogsByType } from './legacy';

const SAMPLES = {
  spring: createSampleLogs().split('\n')[0],
  django: '[2024-01-15 08:23:45,123] INFO django.request: Request started',
  node: '2024-01-15 08:23:45 info: Server listening on 3000',
  log4j: 'INFO -- Application started',
  sql: 'Executing SQL: SELECT * FROM users',
  webpack: 'webpack 5.0.0 compiled successfully in 120 ms',
  generic: 'hello world',
} as const;

describe('detectLogType', () => {
  for (const [type, line] of Object.entries(SAMPLES)) {
    it(`detects ${type}`, () => {
      expect(detectLogType(line)).toBe(type);
    });
  }
});

describe('parseLogsByType', () => {
  it('parses the Spring sample into levelled entries', () => {
    const logs = parseLogsByType(createSampleLogs(), 'auto');
    expect(logs).toHaveLength(10);
    expect(logs.map((l) => l.level)).toEqual([
      'info',
      'warn',
      'error',
      'debug',
      'info',
      'success',
      'warn',
      'info',
      'error',
      'debug',
    ]);
    expect(logs[0]).toEqual({
      id: 0,
      timestamp: '2024-01-15T08:23:45.123',
      level: 'info',
      component: 'com.example.UserService',
      message: 'User authentication successful',
      details: 'userId=12345',
      raw: SAMPLES.spring,
    });
    for (const log of logs) expect(log.message).toBeTruthy();
  });

  it('parses Django lines and maps WARNING to warn', () => {
    const [log] = parseLogsByType(
      '[2024-01-15 08:23:45,123] WARNING app.views: Slow query',
      'django',
    );
    expect(log).toMatchObject({
      timestamp: '2024-01-15 08:23:45,123',
      level: 'warn',
      component: 'app.views',
      message: 'Slow query',
    });
  });

  it('parses Node, Log4j, SQL and Webpack lines', () => {
    expect(parseLogsByType(SAMPLES.node, 'node')[0]).toMatchObject({
      timestamp: '2024-01-15 08:23:45',
      level: 'info',
      message: 'Server listening on 3000',
    });
    expect(
      parseLogsByType(
        '2024-01-15 08:23:45,123 ERROR [main] Boom happened',
        'log4j',
      )[0],
    ).toMatchObject({
      level: 'error',
      component: 'main',
      message: 'Boom happened',
    });
    expect(
      parseLogsByType('Query failed with error. Executed in 12 ms', 'sql')[0],
    ).toMatchObject({ level: 'error', executionTime: '12ms' });
    expect(parseLogsByType(SAMPLES.webpack, 'webpack')[0]).toMatchObject({
      level: 'success',
      buildTime: '120ms',
    });
  });

  it('falls back to info with the raw line when a format line does not match', () => {
    expect(parseLogsByType('not a spring line', 'spring')).toEqual([
      {
        id: 0,
        level: 'info',
        message: 'not a spring line',
        raw: 'not a spring line',
      },
    ]);
  });

  it('classifies generic lines and extracts a timestamp; skips blank lines', () => {
    const logs = parseLogsByType(
      '2024/01/15 10:00:00 Something failed\n\n  \nDEBUG detail\nwarning here\nok',
      'generic',
    );
    expect(logs.map((l) => [l.id, l.level])).toEqual([
      [0, 'error'],
      [1, 'debug'],
      [2, 'warn'],
      [3, 'info'],
    ]);
    expect(logs[0].timestamp).toBe('2024/01/15 10:00:00');
  });
});
